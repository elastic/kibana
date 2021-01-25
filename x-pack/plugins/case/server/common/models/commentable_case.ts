/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectReference, SavedObjectsClientContract } from 'src/core/server';
import {
  CaseSettings,
  CaseStatuses,
  CollectionWithSubCaseAttributes,
  ESCaseAttributes,
  SubCaseAttributes,
} from '../../../common/api';
import { transformESConnectorToCaseConnector } from '../../routes/api/cases/helpers';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../saved_object_types';
import { CaseServiceSetup } from '../../services';

interface UserInfo {
  username: string | null | undefined;
  full_name: string | null | undefined;
  email: string | null | undefined;
}

/**
 * This class represents a case that can have a comment attached to it. This includes
 * a Sub Case, Case, and Collection.
 */
export class CommentableCase {
  constructor(
    private collection: SavedObject<ESCaseAttributes>,
    private subCase?: SavedObject<SubCaseAttributes>
  ) {}

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
      subCase: this.subCase?.attributes ?? null,
      caseCollection: {
        ...this.collection.attributes,
        connector: transformESConnectorToCaseConnector(this.collection.attributes.connector),
      },
    };
  }

  // TODO: refactor this, we shouldn't really need to know the saved object type?
  public buildRefsToCase(): SavedObjectReference[] {
    const type = this.subCase ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;
    return [
      {
        type,
        name: `associated-${type}`,
        id: this.id,
      },
    ];
  }

  public async update({
    service,
    soClient,
    date,
    user,
  }: {
    service: CaseServiceSetup;
    soClient: SavedObjectsClientContract;
    date: string;
    user: UserInfo;
  }): Promise<CommentableCase> {
    if (this.subCase) {
      const updated = await service.patchSubCase({
        client: soClient,
        subCaseId: this.subCase.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: {
            ...user,
          },
        },
        version: this.subCase.version,
      });

      return new CommentableCase(this.collection, {
        ...this.subCase,
        attributes: {
          ...this.subCase.attributes,
          ...updated.attributes,
        },
        version: updated.version ?? this.subCase.version,
      });
    }

    const updated = await service.patchCase({
      client: soClient,
      caseId: this.collection.id,
      updatedAttributes: {
        updated_at: date,
        updated_by: { ...user },
      },
      version: this.collection.version,
    });

    return new CommentableCase(
      {
        ...this.collection,
        attributes: {
          ...this.collection.attributes,
          ...updated.attributes,
        },
        version: updated.version ?? this.collection.version,
      },
      this.subCase
    );
  }
}
