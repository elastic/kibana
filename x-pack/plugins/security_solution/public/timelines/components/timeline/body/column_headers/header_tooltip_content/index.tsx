/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { ColumnHeaderOptions } from '../../../../../../../common/types';
import { getIconFromType } from '../../../../../../common/components/event_details/helpers';
import * as i18n from '../translations';

const IconType = styled(EuiIcon)`
  margin-right: 3px;
  position: relative;
  top: -2px;
`;
IconType.displayName = 'IconType';

const P = styled.span`
  margin-bottom: 5px;
`;
P.displayName = 'P';

const ToolTipTableMetadata = styled.span`
  margin-right: 5px;
  display: block;
`;
ToolTipTableMetadata.displayName = 'ToolTipTableMetadata';

const ToolTipTableValue = styled.span`
  word-wrap: break-word;
`;
ToolTipTableValue.displayName = 'ToolTipTableValue';

export const HeaderToolTipContent = React.memo<{ header: ColumnHeaderOptions }>(({ header }) => (
  <>
    {!isEmpty(header.category) && (
      <P>
        <ToolTipTableMetadata data-test-subj="category">
          {i18n.CATEGORY}
          {':'}
        </ToolTipTableMetadata>
        <ToolTipTableValue data-test-subj="category-value">{header.category}</ToolTipTableValue>
      </P>
    )}
    <P>
      <ToolTipTableMetadata data-test-subj="field">
        {i18n.FIELD}
        {':'}
      </ToolTipTableMetadata>
      <ToolTipTableValue data-test-subj="field-value">{header.id}</ToolTipTableValue>
    </P>
    <P>
      <ToolTipTableMetadata data-test-subj="type">
        {i18n.TYPE}
        {':'}
      </ToolTipTableMetadata>
      <ToolTipTableValue>
        <IconType data-test-subj="type-icon" type={getIconFromType(header.type)} />
        <span data-test-subj="type-value">{header.type}</span>
      </ToolTipTableValue>
    </P>
    {!isEmpty(header.description) && (
      <P>
        <ToolTipTableMetadata data-test-subj="description">
          {i18n.DESCRIPTION}
          {':'}
        </ToolTipTableMetadata>
        <ToolTipTableValue data-test-subj="description-value">
          {header.description}
        </ToolTipTableValue>
      </P>
    )}
  </>
));
HeaderToolTipContent.displayName = 'HeaderToolTipContent';
