/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference, SavedObjectsClientContract } from 'src/core/server';
import {
  CaseSettings,
  CaseStatuses,
  CollectionWithSubCaseAttributes,
  CollectWithSubCaseResponseRt,
  ESCaseAttributes,
  SubCaseAttributes,
} from '../../../common/api';
import { transformESConnectorToCaseConnector } from '../../routes/api/cases/helpers';
import { flattenCommentSavedObjects, flattenSubCaseSavedObject } from '../../routes/api/utils';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../saved_object_types';
import { CaseServiceSetup } from '../../services';
import { countAlertsForID } from '../index';

interface UserInfo {
  username: string | null | undefined;
  full_name: string | null | undefined;
  email: string | null | undefined;
}

interface CommentableCaseParams {
  collection: SavedObject<ESCaseAttributes>;
  subCase?: SavedObject<SubCaseAttributes>;
  soClient: SavedObjectsClientContract;
  service: CaseServiceSetup;
}

/**
 * This class represents a case that can have a comment attached to it. This includes
 * a Sub Case, Case, and Collection.
 */
export class CommentableCase {
  private readonly collection: SavedObject<ESCaseAttributes>;
  private readonly subCase?: SavedObject<SubCaseAttributes>;
  private readonly soClient: SavedObjectsClientContract;
  private readonly service: CaseServiceSetup;
  constructor({ collection, subCase, soClient, service }: CommentableCaseParams) {
    this.collection = collection;
    this.subCase = subCase;
    this.soClient = soClient;
    this.service = service;
  }

  public get status(): CaseStatuses {
    return this.subCase?.attributes.status ?? this.collection.attributes.status;
  }

  public get id(): string {
    return this.subCase?.id ?? this.collection.id;
  }

  public get version(): string | undefined {
    return this.subCase?.version ?? this.collection.version;
  }

  public get settings(): CaseSettings {
    return this.collection.attributes.settings;
  }

  public get attributes(): CollectionWithSubCaseAttributes {
    return {
      subCase: this.subCase?.attributes,
      case: {
        ...this.collection.attributes,
        connector: transformESConnectorToCaseConnector(this.collection.attributes.connector),
      },
    };
  }

  // TODO: refactor this, we shouldn't really need to know the saved object type?
  public buildRefsToCase(): SavedObjectReference[] {
    const subCaseSOType = SUB_CASE_SAVED_OBJECT;
    const caseSOType = CASE_SAVED_OBJECT;
    return [
      {
        type: caseSOType,
        name: `associated-${caseSOType}`,
        id: this.collection.id,
      },
      ...(this.subCase
        ? [{ type: subCaseSOType, name: `associated-${subCaseSOType}`, id: this.subCase.id }]
        : []),
    ];
  }

  private formatCollectionForEncoding(totalComment: number) {
    return {
      id: this.collection.id,
      version: this.collection.version ?? '0',
      totalComment,
      ...this.collection.attributes,
      connector: transformESConnectorToCaseConnector(this.collection.attributes.connector),
    };
  }

  public async encode() {
    const collectionCommentStats = await this.service.getAllCaseComments({
      client: this.soClient,
      id: this.collection.id,
      options: {
        fields: [],
        page: 1,
        perPage: 1,
      },
    });

    if (this.subCase) {
      const subCaseComments = await this.service.getAllSubCaseComments({
        client: this.soClient,
        id: this.subCase.id,
      });

      return CollectWithSubCaseResponseRt.encode({
        subCase: flattenSubCaseSavedObject({
          savedObject: this.subCase,
          comments: subCaseComments.saved_objects,
          totalAlerts: countAlertsForID({ comments: subCaseComments, id: this.subCase.id }),
        }),
        ...this.formatCollectionForEncoding(collectionCommentStats.total),
      });
    }

    const collectionComments = await this.service.getAllCaseComments({
      client: this.soClient,
      id: this.collection.id,
      options: {
        fields: [],
        page: 1,
        perPage: collectionCommentStats.total,
      },
    });

    return CollectWithSubCaseResponseRt.encode({
      comments: flattenCommentSavedObjects(collectionComments.saved_objects),
      totalAlerts: countAlertsForID({ comments: collectionComments, id: this.collection.id }),
      ...this.formatCollectionForEncoding(collectionCommentStats.total),
    });
  }

  public async update({ date, user }: { date: string; user: UserInfo }): Promise<CommentableCase> {
    if (this.subCase) {
      const updated = await this.service.patchSubCase({
        client: this.soClient,
        subCaseId: this.subCase.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: {
            ...user,
          },
        },
        version: this.subCase.version,
      });

      return new CommentableCase({
        soClient: this.soClient,
        service: this.service,
        collection: this.collection,
        subCase: {
          ...this.subCase,
          attributes: {
            ...this.subCase.attributes,
            ...updated.attributes,
          },
          version: updated.version ?? this.subCase.version,
        },
      });
    }

    const updated = await this.service.patchCase({
      client: this.soClient,
      caseId: this.collection.id,
      updatedAttributes: {
        updated_at: date,
        updated_by: { ...user },
      },
      version: this.collection.version,
    });

    return new CommentableCase({
      collection: {
        ...this.collection,
        attributes: {
          ...this.collection.attributes,
          ...updated.attributes,
        },
        version: updated.version ?? this.collection.version,
      },
      subCase: this.subCase,
      soClient: this.soClient,
      service: this.service,
    });
  }
}
