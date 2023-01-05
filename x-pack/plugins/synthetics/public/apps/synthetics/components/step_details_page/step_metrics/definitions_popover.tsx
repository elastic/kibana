/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiButtonEmpty, EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CLS_HELP_LABEL,
  CLS_LABEL,
  DCL_LABEL,
  DCL_TOOLTIP,
  FCP_LABEL,
  FCP_TOOLTIP,
  LCP_HELP_LABEL,
  LCP_LABEL,
} from './labels';

const definitionList = [
  {
    title: FCP_LABEL,
    description: FCP_TOOLTIP,
  },
  {
    title: LCP_LABEL,
    description: LCP_HELP_LABEL,
  },
  {
    title: CLS_LABEL,
    description: CLS_HELP_LABEL,
  },
  {
    title: DCL_LABEL,
    description: DCL_TOOLTIP,
  },
];

export const DefinitionsPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((prevPopoverOpen) => !prevPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty iconType="list" iconSide="right" onClick={onButtonClick}>
          {DEFINITIONS_LABEL}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightCenter"
    >
      <EuiPopoverTitle>{DEFINITIONS_LABEL}</EuiPopoverTitle>
      <div style={{ width: '350px' }}>
        <EuiDescriptionList listItems={definitionList} />
      </div>
    </EuiPopover>
  );
};

const DEFINITIONS_LABEL = i18n.translate('xpack.synthetics.stepDetailsRoute.definition', {
  defaultMessage: 'Definitions',
});
