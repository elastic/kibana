/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { SubCaseResponseRt } from '../../../common/api';
import { CasesClientArgs } from '..';
import { flattenSubCaseSavedObject } from '../../routes/api/utils';
import { countAlertsForID } from '../../common';
import { createCaseError } from '../../common/error';

/**
 * Client for handling the different exposed API routes for interacting with sub cases.
 */
export class SubCasesClient {
  constructor(private readonly args: CasesClientArgs) {}

  public async get({
    includeComments,
    id,
    soClient,
  }: {
    includeComments: boolean;
    id: string;
    soClient: SavedObjectsClientContract;
  }) {
    try {
      const subCase = await this.args.caseService.getSubCase({
        soClient,
        id,
      });

      if (!includeComments) {
        return SubCaseResponseRt.encode(
          flattenSubCaseSavedObject({
            savedObject: subCase,
          })
        );
      }

      const theComments = await this.args.caseService.getAllSubCaseComments({
        soClient,
        id,
        options: {
          sortField: 'created_at',
          sortOrder: 'asc',
        },
      });

      return SubCaseResponseRt.encode(
        flattenSubCaseSavedObject({
          savedObject: subCase,
          comments: theComments.saved_objects,
          totalComment: theComments.total,
          totalAlerts: countAlertsForID({
            comments: theComments,
            id,
          }),
        })
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to get sub case id: ${id}: ${error}`,
        error,
        logger: this.args.logger,
      });
    }
  }
}
