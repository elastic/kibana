/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable, EuiText } from '@elastic/eui';
import React, { useState } from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';

const namespacesSelectorLabel = i18n.translate('xpack.datasetQuality.namespacesSelectorLabel', {
  defaultMessage: 'Namespaces',
});

const namespacesSelectorLoading = i18n.translate('xpack.datasetQuality.namespacesSelectorLoading', {
  defaultMessage: 'Loading namespaces',
});

const namespacesSelectorSearchPlaceholder = i18n.translate(
  'xpack.datasetQuality.namespacesSelectorSearchPlaceholder',
  {
    defaultMessage: 'Filter namespaces',
  }
);

const namespacesSelectorNoneAvailable = i18n.translate(
  'xpack.datasetQuality.namespacesSelectorNoneAvailable',
  {
    defaultMessage: 'No namespaces available',
  }
);

const namespacesSelectorNoneMatching = i18n.translate(
  'xpack.datasetQuality.namespacesSelectorNoneMatching',
  {
    defaultMessage: 'No namespaces found',
  }
);

interface NamespacesSelectorProps {
  isLoading: boolean;
  namespaces: NamespaceItem[];
  onNamespacesChange: (namespaces: NamespaceItem[]) => void;
}

export interface NamespaceItem {
  label: string;
  checked?: EuiSelectableOptionCheckedType;
}

export function NamespacesSelector({
  isLoading,
  namespaces,
  onNamespacesChange,
}: NamespacesSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const renderOption = (namespace: NamespaceItem) => <EuiText size="s">{namespace.label}</EuiText>;

  const button = (
    <EuiFilterButton
      data-test-subj="datasetQualityNamespacesSelectableButton"
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={namespaces.length}
      hasActiveFilters={!!namespaces.find((item) => item.checked === 'on')}
      numActiveFilters={namespaces.filter((item) => item.checked === 'on').length}
    >
      {namespacesSelectorLabel}
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
        data-test-subj="datasetQualityNamespacesSelectable"
        searchable
        searchProps={{
          placeholder: namespacesSelectorSearchPlaceholder,
          compressed: true,
        }}
        aria-label={namespacesSelectorLabel}
        options={namespaces}
        onChange={onNamespacesChange}
        isLoading={isLoading}
        loadingMessage={namespacesSelectorLoading}
        emptyMessage={namespacesSelectorNoneAvailable}
        noMatchesMessage={namespacesSelectorNoneMatching}
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
