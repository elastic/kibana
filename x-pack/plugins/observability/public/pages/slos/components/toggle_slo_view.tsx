/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { CardsPerRow } from './card_view/cards_per_row';

export type SLOViewType = 'cardView' | 'listView';

interface Props {
  setCardsPerRow: (gridSize?: string) => void;
  setSLOView: (view: SLOViewType) => void;
  sloView: SLOViewType;
}
const toggleButtonsIcons = [
  {
    id: `cardView`,
    label: 'Card View',
    iconType: 'visGauge',
    'data-test-subj': 'sloCardViewButton',
  },
  {
    id: `listView`,
    label: 'List View',
    iconType: 'list',
    'data-test-subj': 'sloListViewButton',
  },
];

export function ToggleSLOView({ sloView, setSLOView, setCardsPerRow }: Props) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiButtonGroup
          legend={i18n.translate('xpack.observability.toggleSLOView.euiButtonGroup.sloView', {
            defaultMessage: 'SLO View',
          })}
          options={toggleButtonsIcons}
          idSelected={sloView}
          onChange={(id) => setSLOView(id as SLOViewType)}
          isIconOnly
        />
      </EuiFlexItem>
      {sloView === 'cardView' && (
        <EuiFlexItem grow={false}>
          <ViewSettings setCardsPerRow={setCardsPerRow} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function ViewSettings({ setCardsPerRow }: { setCardsPerRow: (cardsPerRow?: string) => void }) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj="o11yToggleSLOViewButton"
          iconType={'gear'}
          aria-label={i18n.translate(
            'xpack.observability.toggleSLOView.euiButtonIcon.settingsLabel',
            { defaultMessage: 'Settings' }
          )}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>
        <FormattedMessage
          id="xpack.observability.viewSettings.viewSettingsPopoverTitleLabel"
          defaultMessage="View settings"
        />
      </EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <CardsPerRow setCardsPerRow={setCardsPerRow} />
      </div>
    </EuiPopover>
  );
}
