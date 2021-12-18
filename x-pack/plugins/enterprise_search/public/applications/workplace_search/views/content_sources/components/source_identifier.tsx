/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCopy,
  EuiButtonIcon,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { API_KEY_LABEL, COPY_TOOLTIP, COPIED_TOOLTIP } from '../../../constants';
import { API_KEYS_PATH } from '../../../routes';

import { ID_LABEL } from '../constants';

interface Props {
  id: string;
}

export const SourceIdentifier: React.FC<Props> = ({ id }) => (
  <>
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{ID_LABEL}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy beforeMessage={COPY_TOOLTIP} afterMessage={COPIED_TOOLTIP} textToCopy={id}>
          {(copy) => (
            <EuiButtonIcon
              aria-label={COPY_TOOLTIP}
              onClick={copy}
              iconType="copy"
              color="primary"
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText value={id} readOnly />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.workplaceSearch.sources.identifier.helpText"
          defaultMessage="Use the Source Identifier with an {apiKeyLink} to sync documents for this custom source."
          values={{
            apiKeyLink: (
              <EuiLinkTo target="_blank" to={API_KEYS_PATH}>
                {API_KEY_LABEL}
              </EuiLinkTo>
            ),
          }}
        />
      </p>
    </EuiText>
  </>
);
