/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { CreateSLOForm } from '../../types';
import { transformCreateSLOFormToCreateSLOInput } from '../../helpers/process_slo_form_values';

export function EquivalentApiRequest({
  isCreateSloLoading,
  isUpdateSloLoading,
}: {
  isCreateSloLoading: boolean;
  isUpdateSloLoading: boolean;
}) {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const { getValues, trigger } = useFormContext<CreateSLOForm>();

  const { data } = useFetcher(async () => {
    if (!isFlyoutVisible) {
      return;
    }
    const isValid = await trigger();
    if (!isValid) {
      return;
    }
    return transformCreateSLOFormToCreateSLOInput(getValues());
  }, [getValues, trigger, isFlyoutVisible]);

  let flyout;

  if (isFlyoutVisible) {
    flyout = (
      <EuiFlyout ownFocus onClose={() => setIsFlyoutVisible(false)}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              {i18n.translate(
                'xpack.observability.equivalentApiRequest.h2.equivalentAPIRequestToLabel',
                { defaultMessage: 'Equivalent API request' }
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <FormattedMessage
              id="xpack.observability.equivalentApiRequest.p.useTheRESTAPILabel"
              defaultMessage="Use the REST API"
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="javascript" isCopyable paddingSize="s">
            {'POST /api/observability/slos'}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
          <EuiText>
            <FormattedMessage
              id="xpack.observability.equivalentApiRequest.p.withTheFollowingBodyLabel"
              defaultMessage="with the following body:"
            />
          </EuiText>
          {data && (
            <EuiCodeBlock language="json" isCopyable paddingSize="s">
              {JSON.stringify(data, null, 2)}
            </EuiCodeBlock>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            data-test-subj="o11yEquivalentApiRequestCloseButton"
            iconType="cross"
            onClick={() => setIsFlyoutVisible(false)}
            flush="left"
          >
            {i18n.translate('xpack.observability.equivalentApiRequest.closeButtonEmptyLabel', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
  return (
    <>
      <EuiButtonEmpty
        color="primary"
        iconType="copyClipboard"
        data-test-subj="sloFormCopyJsonButton"
        disabled={isCreateSloLoading || isUpdateSloLoading}
        onClick={() => setIsFlyoutVisible(true)}
      >
        {i18n.translate('xpack.observability.slo.sloEdit.equivalentApiRequest', {
          defaultMessage: 'Equivalent API request',
        })}
      </EuiButtonEmpty>
      {flyout}
    </>
  );
}
