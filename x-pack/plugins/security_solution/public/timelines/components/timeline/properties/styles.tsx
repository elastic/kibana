/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText } from '@elastic/eui';
import styled from 'styled-components';

export const NameField = styled(EuiFieldText)`
  .euiToolTipAnchor {
    display: block;
  }
`;
NameField.displayName = 'NameField';

export const NameWrapper = styled.div`
  .euiToolTipAnchor {
    display: block;
  }
`;
NameWrapper.displayName = 'NameWrapper';

export const DescriptionContainer = styled.div`
  .euiToolTipAnchor {
    display: block;
  }
`;
DescriptionContainer.displayName = 'DescriptionContainer';

export const LabelText = styled.div`
  margin-left: 10px;
`;
LabelText.displayName = 'LabelText';
