/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { ESCaseAttributes, ExternalServicesWithoutConnectorId } from './types';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  SEVERITY_ESMODEL_TO_EXTERNAL,
  SEVERITY_EXTERNAL_TO_ESMODEL,
  STATUS_ESMODEL_TO_EXTERNAL,
  STATUS_EXTERNAL_TO_ESMODEL,
} from '../../common/constants';
import type { CaseAttributes, CaseFullExternalService } from '../../../common/api';
import { CaseSeverity, CaseStatuses, NONE_CONNECTOR_ID } from '../../../common/api';
import {
  findConnectorIdReference,
  transformFieldsToESModel,
  transformESConnectorOrUseDefault,
  transformESConnectorToExternalModel,
} from '../transform';
import { ConnectorReferenceHandler } from '../connector_reference_handler';
import type { CaseSavedObject } from '../../common/types';

export function transformUpdateResponsesToExternalModels(
  response: SavedObjectsBulkUpdateResponse<ESCaseAttributes>
): SavedObjectsBulkUpdateResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformUpdateResponseToExternalModel(so),
    })),
  };
}

export function transformUpdateResponseToExternalModel(
  updatedCase: SavedObjectsUpdateResponse<ESCaseAttributes>
): SavedObjectsUpdateResponse<CaseAttributes> {
  const {
    connector,
    external_service,
    severity,
    status,
    total_alerts,
    total_comments,
    ...restUpdateAttributes
  } =
    updatedCase.attributes ??
    ({
      total_alerts: -1,
      total_comments: -1,
    } as ESCaseAttributes);

  const transformedConnector = transformESConnectorToExternalModel({
    // if the saved object had an error the attributes field will not exist
    connector,
    references: updatedCase.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  let externalService: CaseFullExternalService | null | undefined;

  // if external_service is not defined then we don't want to include it in the response since it wasn't passed it as an
  // attribute to update
  if (external_service !== undefined) {
    externalService = transformESExternalService(external_service, updatedCase.references);
  }

  return {
    ...updatedCase,
    attributes: {
      ...restUpdateAttributes,
      ...((severity || severity === 0) && { severity: SEVERITY_ESMODEL_TO_EXTERNAL[severity] }),
      ...((status || status === 0) && { status: STATUS_ESMODEL_TO_EXTERNAL[status] }),
      ...(transformedConnector && { connector: transformedConnector }),
      // if externalService is null that means we intentionally updated it to null within ES so return that as a valid value
      ...(externalService !== undefined && { external_service: externalService }),
    },
  };
}

export function transformAttributesToESModel(caseAttributes: CaseAttributes): {
  attributes: ESCaseAttributes;
  referenceHandler: ConnectorReferenceHandler;
};
export function transformAttributesToESModel(caseAttributes: Partial<CaseAttributes>): {
  attributes: Partial<ESCaseAttributes>;
  referenceHandler: ConnectorReferenceHandler;
};
export function transformAttributesToESModel(caseAttributes: Partial<CaseAttributes>): {
  attributes: Partial<ESCaseAttributes>;
  referenceHandler: ConnectorReferenceHandler;
} {
  const { connector, external_service, severity, status, ...restAttributes } = caseAttributes;
  const { connector_id: pushConnectorId, ...restExternalService } = external_service ?? {};

  const transformedConnector = {
    ...(connector && {
      connector: {
        name: connector.name,
        type: connector.type,
        fields: transformFieldsToESModel(connector),
      },
    }),
  };

  const transformedExternalService = {
    ...(external_service
      ? { external_service: restExternalService }
      : external_service === null
      ? { external_service: null }
      : {}),
  };

  return {
    attributes: {
      ...restAttributes,
      ...transformedConnector,
      ...transformedExternalService,
      ...(severity && { severity: SEVERITY_EXTERNAL_TO_ESMODEL[severity] }),
      ...(status && { status: STATUS_EXTERNAL_TO_ESMODEL[status] }),
    },
    referenceHandler: buildReferenceHandler(connector?.id, pushConnectorId),
  };
}

function buildReferenceHandler(
  connectorId?: string,
  pushConnectorId?: string | null
): ConnectorReferenceHandler {
  return new ConnectorReferenceHandler([
    { id: connectorId, name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
    { id: pushConnectorId, name: PUSH_CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
  ]);
}

/**
 * Until Kibana uses typescript 4.3 or higher we'll have to keep these functions separate instead of using an overload
 * definition like this:
 *
 * export function transformArrayResponseToExternalModel(
 *  response: SavedObjectsBulkResponse<ESCaseAttributes> | SavedObjectsFindResponse<ESCaseAttributes>
 * ): SavedObjectsBulkResponse<CaseAttributes> | SavedObjectsFindResponse<CaseAttributes> {
 *
 * See this issue for more details: https://stackoverflow.com/questions/49510832/typescript-how-to-map-over-union-array-type
 */

export function transformBulkResponseToExternalModel(
  response: SavedObjectsBulkResponse<ESCaseAttributes>
): SavedObjectsBulkResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformSavedObjectToExternalModel(so),
    })),
  };
}

export function transformFindResponseToExternalModel(
  response: SavedObjectsFindResponse<ESCaseAttributes>
): SavedObjectsFindResponse<CaseAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformSavedObjectToExternalModel(so),
    })),
  };
}

export function transformSavedObjectToExternalModel(
  caseSavedObject: SavedObject<ESCaseAttributes>
): CaseSavedObject {
  const connector = transformESConnectorOrUseDefault({
    // if the saved object had an error the attributes field will not exist
    connector: caseSavedObject.attributes?.connector,
    references: caseSavedObject.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const externalService = transformESExternalService(
    caseSavedObject.attributes?.external_service,
    caseSavedObject.references
  );

  const severity =
    SEVERITY_ESMODEL_TO_EXTERNAL[caseSavedObject.attributes?.severity] ?? CaseSeverity.LOW;
  const status =
    STATUS_ESMODEL_TO_EXTERNAL[caseSavedObject.attributes?.status] ?? CaseStatuses.open;

  const { total_alerts, total_comments, ...caseSavedObjectAttributes } =
    caseSavedObject.attributes ??
    ({
      total_alerts: -1,
      total_comments: -1,
    } as ESCaseAttributes);

  return {
    ...caseSavedObject,
    attributes: {
      ...caseSavedObjectAttributes,
      severity,
      status,
      connector,
      external_service: externalService,
    },
  };
}

function transformESExternalService(
  // this type needs to match that of CaseFullExternalService except that it does not include the connector_id, see: x-pack/plugins/cases/common/api/cases/case.ts
  // that's why it can be null here
  externalService: ExternalServicesWithoutConnectorId | null | undefined,
  references: SavedObjectReference[] | undefined
): CaseFullExternalService | null {
  const connectorIdRef = findConnectorIdReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, references);

  if (!externalService) {
    return null;
  }

  return {
    ...externalService,
    connector_id: connectorIdRef?.id ?? NONE_CONNECTOR_ID,
  };
}
