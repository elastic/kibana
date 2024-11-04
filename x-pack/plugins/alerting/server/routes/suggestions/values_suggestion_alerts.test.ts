/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import { dataPluginMock } from '@kbn/unified-search-plugin/server/mocks';
import { termsAggSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_agg';
import { Observable } from 'rxjs';
import { licenseStateMock } from '../../lib/license_state.mock';
import { rulesClientMock } from '../../rules_client.mock';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { registerAlertsValueSuggestionsRoute } from './values_suggestion_alerts';

jest.mock('@kbn/unified-search-plugin/server/autocomplete/terms_agg', () => {
  return {
    termsAggSuggestions: jest.fn(),
  };
});

const termsAggSuggestionsMock = termsAggSuggestions as jest.Mock;

jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('registerAlertsValueSuggestionsRoute', () => {
  const rulesClient = rulesClientMock.create();
  let config$: Observable<ConfigSchema>;

  beforeEach(() => {
    termsAggSuggestionsMock.mockClear();
    rulesClient.getSpaceId.mockReturnValue('space-x');
    config$ = dataPluginMock
      .createSetupContract()
      .autocomplete.getInitializerContextConfig()
      .create();
  });

  test('happy path route registered', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const getAlertIndicesAliasMock = jest.fn().mockReturnValue(['alert-index']);
    registerAlertsValueSuggestionsRoute(router, licenseState, config$, getAlertIndicesAliasMock);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerts/suggestions/values"`);

    const mockRequest = httpServerMock.createKibanaRequest<never, never, never>({
      body: {
        field: 'alert.tags',
        query: 'test-query',
        filters: 'test-filters',
        fieldMeta: 'test-field-meta',
      },
    });

    const [context, req, res] = mockHandlerArguments({ rulesClient }, mockRequest, ['ok']);

    await handler(
      {
        ...context,
        core: { elasticsearch: { client: { asInternalUser: {} } }, savedObjects: { client: {} } },
      },
      req,
      res
    );

    expect(rulesClient.getAuthorization).toHaveBeenCalledTimes(1);
    expect(rulesClient.getSpaceId).toHaveBeenCalledTimes(1);
    expect(termsAggSuggestionsMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      'alert-index',
      'alert.tags',
      'test-query',
      [{ term: { 'kibana.space_ids': 'space-x' } }],
      'test-field-meta',
      expect.any(Object)
    );
    expect(res.ok).toHaveBeenCalled();
  });
});
