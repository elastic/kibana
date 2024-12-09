/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { Integration } from '../../../../common/data_streams_stats/integration';
import { IntegrationIcon } from '../../common';

const integrationsSelectorLabel = i18n.translate('xpack.datasetQuality.integrationsSelectorLabel', {
  defaultMessage: 'Integrations',
});

const integrationsSelectorLoading = i18n.translate(
  'xpack.datasetQuality.integrationsSelectorLoading',
  {
    defaultMessage: 'Loading integrations',
  }
);

const integrationsSelectorSearchPlaceholder = i18n.translate(
  'xpack.datasetQuality.integrationsSelectorSearchPlaceholder',
  {
    defaultMessage: 'Filter integrations',
  }
);

const integrationsSelectorNoneAvailable = i18n.translate(
  'xpack.datasetQuality.integrationsSelectorNoneAvailable',
  {
    defaultMessage: 'No integrations available',
  }
);

const integrationsSelectorNoneMatching = i18n.translate(
  'xpack.datasetQuality.integrationsSelectorNoneMatching',
  {
    defaultMessage: 'No integrations found',
  }
);

interface IntegrationsSelectorProps {
  isLoading: boolean;
  integrations: IntegrationItem[];
  onIntegrationsChange: (integrations: IntegrationItem[]) => void;
}

export interface IntegrationItem extends Integration {
  label: string;
  checked?: EuiSelectableOptionCheckedType;
}

export function IntegrationsSelector({
  isLoading,
  integrations,
  onIntegrationsChange,
}: IntegrationsSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const renderOption = (integration: IntegrationItem) => (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <IntegrationIcon integration={integration} />
      </EuiFlexItem>
      <EuiText size="s">{integration.title}</EuiText>
    </EuiFlexGroup>
  );

  const button = (
    <EuiFilterButton
      data-test-subj="datasetQualityIntegrationsSelectableButton"
      iconType="arrowDown"
      badgeColor="accentSecondary"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={integrations.length}
      hasActiveFilters={!!integrations.find((item) => item.checked === 'on')}
      numActiveFilters={integrations.filter((item) => item.checked === 'on').length}
    >
      {integrationsSelectorLabel}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiSelectable
        data-test-subj="datasetQualityIntegrationsSelectable"
        searchable
        searchProps={{
          placeholder: integrationsSelectorSearchPlaceholder,
          compressed: true,
        }}
        aria-label={integrationsSelectorLabel}
        options={integrations}
        onChange={onIntegrationsChange}
        isLoading={isLoading}
        loadingMessage={integrationsSelectorLoading}
        emptyMessage={integrationsSelectorNoneAvailable}
        noMatchesMessage={integrationsSelectorNoneMatching}
        renderOption={(option) => renderOption(option)}
      >
        {(list, search) => (
          <div style={{ width: 300 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
