/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { EuiButtonEmpty, EuiHorizontalRule, EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import { urlFromQueryParams } from '../url_from_query_params';
import { HostMetadata } from '../../../../../../common/types';
import { useHostListSelector } from '../hooks';
import { uiQueryParams } from '../../../store/hosts/selectors';

export const PolicyResponse = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  const history = useHistory();
  const { show, ...queryParams } = useHostListSelector(uiQueryParams);
  const detailsUri = useMemo(() => {
    return urlFromQueryParams({
      ...queryParams,
      selected_host: hostMeta.host.id,
    });
  }, [hostMeta.host.id, queryParams]);
  const buttonContentProps = useMemo(() => {
    return { style: { paddingLeft: '0' } };
  }, []);
  return (
    <>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButtonEmpty
        data-test-subj="backToHostDetails"
        iconType="arrowLeft"
        contentProps={buttonContentProps}
        size="xs"
        href={'?' + detailsUri.search}
        onClick={(ev: React.MouseEvent) => {
          ev.preventDefault();
          history.push(detailsUri);
        }}
      >
        <FormattedMessage
          id="xpack.endpoint.host.policyResponse.detailsLinkTitle"
          defaultMessage="Endpoint Details"
        />
      </EuiButtonEmpty>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.endpoint.host.policyResponse.title"
            defaultMessage="Policy Response"
          />
        </h3>
      </EuiTitle>
      <EuiHorizontalRule />
    </>
  );
});
