/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook } from '@testing-library/react-hooks';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { useCasesFeatures } from '../../common/use_cases_features';

import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { CustomFieldTypes } from '../../../common/types/domain';

jest.mock('../../common/use_cases_features');
jest.mock('../../containers/configure/use_get_case_configuration');

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;

describe('useCasesColumnsConfiguration ', () => {
  let appMockRender: AppMockRenderer;
  const license = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer({ license });
    useCasesFeaturesMock.mockReturnValue({
      caseAssignmentAuthorized: true,
      isAlertsEnabled: true,
    });
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('returns all columns correctly', async () => {
    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "actions": Object {
          "canDisplay": true,
          "field": "actions",
          "name": "Actions",
        },
        "assignCaseAction": Object {
          "canDisplay": true,
          "field": "",
          "name": "",
        },
        "assignees": Object {
          "canDisplay": true,
          "field": "assignees",
          "name": "Assignees",
        },
        "category": Object {
          "canDisplay": true,
          "field": "category",
          "name": "Category",
        },
        "closedAt": Object {
          "canDisplay": true,
          "field": "closedAt",
          "name": "Closed on",
        },
        "createdAt": Object {
          "canDisplay": true,
          "field": "createdAt",
          "name": "Created on",
        },
        "externalIncident": Object {
          "canDisplay": true,
          "field": "externalIncident",
          "name": "External incident",
        },
        "owner": Object {
          "canDisplay": false,
          "field": "owner",
          "name": "Solution",
        },
        "severity": Object {
          "canDisplay": true,
          "field": "severity",
          "name": "Severity",
        },
        "status": Object {
          "canDisplay": true,
          "field": "status",
          "name": "Status",
        },
        "tags": Object {
          "canDisplay": true,
          "field": "tags",
          "name": "Tags",
        },
        "title": Object {
          "canDisplay": true,
          "field": "title",
          "name": "Name",
        },
        "totalAlerts": Object {
          "canDisplay": true,
          "field": "totalAlerts",
          "name": "Alerts",
        },
        "totalComment": Object {
          "canDisplay": true,
          "field": "totalComment",
          "name": "Comments",
        },
        "updatedAt": Object {
          "canDisplay": true,
          "field": "updatedAt",
          "name": "Updated on",
        },
      }
    `);
  });

  it('cannot display actions without update permissions', async () => {
    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.actions).toMatchInlineSnapshot(`
      Object {
        "canDisplay": true,
        "field": "actions",
        "name": "Actions",
      }
    `);
  });

  it('cannot display actions without delete permissions', async () => {
    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.actions).toMatchInlineSnapshot(`
      Object {
        "canDisplay": true,
        "field": "actions",
        "name": "Actions",
      }
    `);
  });

  it('cannot display assignees when case assignment is not authorized', async () => {
    useCasesFeaturesMock.mockReturnValue({
      caseAssignmentAuthorized: false,
      isAlertsEnabled: true,
    });

    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.assignees).toMatchInlineSnapshot(`
      Object {
        "canDisplay": false,
        "field": "assignees",
        "name": "Assignees",
      }
    `);
  });

  it('cannot display alerts if alerts are not enabled', async () => {
    useCasesFeaturesMock.mockReturnValue({
      caseAssignmentAuthorized: true,
      isAlertsEnabled: false,
    });

    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.totalAlerts).toMatchInlineSnapshot(`
      Object {
        "canDisplay": false,
        "field": "totalAlerts",
        "name": "Alerts",
      }
    `);
  });

  it('cannot display owner if none is available', async () => {
    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.owner).toMatchInlineSnapshot(`
      Object {
        "canDisplay": false,
        "field": "owner",
        "name": "Solution",
      }
    `);
  });

  it('includes custom field columns correctly', async () => {
    const textKey = 'text_key';
    const toggleKey = 'toggle_key';

    const textLabel = 'Text Label';
    const toggleLabel = 'Toggle Label';

    useGetCaseConfigurationMock.mockImplementation(() => ({
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [
          { key: textKey, label: textLabel, type: CustomFieldTypes.TEXT },
          { key: toggleKey, label: toggleLabel, type: CustomFieldTypes.TOGGLE },
        ],
      },
    }));

    const { result } = renderHook(() => useCasesColumnsConfiguration(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current[textKey]).toEqual({ field: textKey, name: textLabel, canDisplay: true });
    expect(result.current[toggleKey]).toEqual({
      field: toggleKey,
      name: toggleLabel,
      canDisplay: true,
    });
  });
});
