/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { Filter } from '../../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../../typings/es_schemas/ui/transaction';
import { callApmApi } from '../../../../../services/rest/create_call_apm_api';
import { replaceTemplateVariables, convertFiltersToQuery } from './helper';

export interface LinkPreviewProps {
  label: string;
  url: string;
  filters: Filter[];
}

const fetchTransaction = debounce(
  async (filters: Filter[], callback: (transaction: Transaction) => void) => {
    const transaction = await callApmApi(
      'GET /internal/apm/settings/custom_links/transaction',
      {
        signal: null,
        params: { query: convertFiltersToQuery(filters) },
      }
    );
    callback(transaction);
  },
  1000
);

const getTextColor = (value?: string) => (value ? 'default' : 'subdued');

export function LinkPreview({ label, url, filters }: LinkPreviewProps) {
  const [transaction, setTransaction] = useState<Transaction | undefined>();

  useEffect(() => {
    /*
      React throwns "Can't perform a React state update on an unmounted component"
      It happens when the Custom Link flyout is closed before the return of the api request.
      To avoid such case, sets the isUnmounted to true when component unmount and check its value before update the transaction.
    */
    let isUnmounted = false;
    fetchTransaction(filters, (_transaction: Transaction) => {
      if (!isUnmounted) {
        setTransaction(_transaction);
      }
    });
    return () => {
      isUnmounted = true;
    };
  }, [filters]);

  const { formattedUrl, error } = replaceTemplateVariables(url, transaction);

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.settings.customLink.previewSectionTitle', {
            defaultMessage: 'Preview',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel paddingSize="l">
        <EuiText
          size="s"
          color={getTextColor(label)}
          className="eui-textBreakWord"
          data-test-subj="preview-label"
        >
          {label
            ? label
            : i18n.translate('xpack.apm.settings.customLink.default.label', {
                defaultMessage: 'Elastic.co',
              })}
        </EuiText>

        <EuiText
          size="s"
          color={getTextColor(url)}
          className="eui-textBreakWord"
          data-test-subj="preview-url"
        >
          {url ? (
            <EuiLink
              href={formattedUrl}
              target="_blank"
              data-test-subj="preview-link"
            >
              {formattedUrl}
            </EuiLink>
          ) : (
            i18n.translate('xpack.apm.settings.customLink.default.url', {
              defaultMessage: 'https://www.elastic.co',
            })
          )}
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.apm.settings.customLink.linkPreview.descrition',
                {
                  defaultMessage:
                    'Test your link with values from an example transaction document based on the filters above.',
                }
              )}
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {error && (
              <EuiToolTip position="top" content={error}>
                <EuiIcon
                  type="alert"
                  color="warning"
                  data-test-subj="preview-warning"
                />
              </EuiToolTip>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
}
