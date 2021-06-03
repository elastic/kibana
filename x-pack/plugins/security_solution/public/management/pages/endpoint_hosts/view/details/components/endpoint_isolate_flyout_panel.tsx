/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { i18n } from '@kbn/i18n';
import { HostMetadata } from '../../../../../../../common/endpoint/types';
import { BackToEndpointDetailsFlyoutSubHeader } from './back_to_endpoint_details_flyout_subheader';
import {
  EndpointIsolatedFormProps,
  EndpointIsolateForm,
  EndpointIsolateSuccess,
} from '../../../../../../common/components/endpoint/host_isolation';
import { FlyoutBodyNoTopPadding } from './flyout_body_no_top_padding';
import { getEndpointDetailsPath } from '../../../../../common/routing';
import { useEndpointSelector } from '../../hooks';
import {
  getIsolationRequestError,
  getIsIsolationRequestPending,
  getWasIsolationRequestSuccessful,
  uiQueryParams,
} from '../../../store/selectors';
import { AppAction } from '../../../../../../common/store/actions';
import { useToasts } from '../../../../../../common/lib/kibana';

export const EndpointIsolateFlyoutPanel = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  const history = useHistory();
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const toast = useToasts();

  const { show, ...queryParams } = useEndpointSelector(uiQueryParams);
  const isPending = useEndpointSelector(getIsIsolationRequestPending);
  const wasSuccessful = useEndpointSelector(getWasIsolationRequestSuccessful);
  const isolateError = useEndpointSelector(getIsolationRequestError);

  const [formValues, setFormValues] = useState<
    Parameters<EndpointIsolatedFormProps['onChange']>[0]
  >({ comment: '' });

  const handleCancel: EndpointIsolatedFormProps['onCancel'] = useCallback(() => {
    history.push(
      getEndpointDetailsPath({
        name: 'endpointDetails',
        ...queryParams,
        selected_endpoint: hostMeta.agent.id,
      })
    );
  }, [history, hostMeta.agent.id, queryParams]);

  const handleConfirm: EndpointIsolatedFormProps['onConfirm'] = useCallback(() => {
    dispatch({
      type: 'endpointIsolationRequest',
      payload: {
        endpoint_ids: [hostMeta.agent.id],
        comment: formValues.comment,
      },
    });
  }, [dispatch, formValues.comment, hostMeta.agent.id]);

  const handleChange: EndpointIsolatedFormProps['onChange'] = useCallback((changes) => {
    setFormValues((prevState) => {
      return {
        ...prevState,
        ...changes,
      };
    });
  }, []);

  useEffect(() => {
    if (isolateError) {
      toast.addDanger(isolateError.message);
    }
  }, [isolateError, toast]);

  return (
    <>
      <BackToEndpointDetailsFlyoutSubHeader endpointId={hostMeta.agent.id} />

      <FlyoutBodyNoTopPadding>
        {wasSuccessful ? (
          <EndpointIsolateSuccess
            hostName={hostMeta.host.name}
            completeButtonLabel={i18n.translate(
              'xpack.securitySolution.endpoint.hostIsolation.successProceedButton',
              { defaultMessage: 'Return to endpoint details' }
            )}
            onComplete={handleCancel}
          />
        ) : (
          <EndpointIsolateForm
            comment={formValues.comment}
            isLoading={isPending}
            hostName={hostMeta.host.name}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            onChange={handleChange}
          />
        )}
      </FlyoutBodyNoTopPadding>
    </>
  );
});
EndpointIsolateFlyoutPanel.displayName = 'EndpointIsolateFlyoutPanel';
