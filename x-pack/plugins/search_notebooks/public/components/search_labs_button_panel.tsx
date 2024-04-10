/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiButton, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const SearchLabsButtonPanel = () => {
  return (
    <EuiPanel hasShadow={false}>
      <EuiFlexGroup justifyContent="center">
        <EuiButton
          href="https://github.com/elastic/elasticsearch-labs"
          target="_blank"
          iconSide="right"
          iconType="popout"
          data-test-subj="console-notebooks-search-labs-btn"
          data-telemetry-id="console-notebooks-search-labs-btn"
        >
          {i18n.translate('xpack.searchNotebooks.searchLabsLink', {
            defaultMessage: 'See more at Elastic Search Labs',
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
