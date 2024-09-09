/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks/dom';
import * as api from '../../../../lib/rule_api/mute_alert';
import { waitFor } from '@testing-library/react';
import { useKibana } from '../../../../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../../../test_utils';
import { useMuteAlert } from './use_mute_alert';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('../../../../lib/rule_api/mute_alert');
jest.mock('../../../../../common/lib/kibana');

const params = { ruleId: '', alertInstanceId: '' };

describe('useMuteAlert', () => {
  const addErrorMock = useKibana().services.notifications.toasts.addError as jest.Mock;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer(AlertsQueryContext);
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'muteAlertInstance');

    const { result } = renderHook(() => useMuteAlert(), {
      wrapper: appMockRender.AppWrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(muteAlertInstanceSpy).toHaveBeenCalledWith({
        id: params.ruleId,
        instanceId: params.alertInstanceId,
        http: expect.anything(),
      });
    });
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest.spyOn(api, 'muteAlertInstance').mockRejectedValue(new Error('An error'));

    const { result } = renderHook(() => useMuteAlert(), {
      wrapper: appMockRender.AppWrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
