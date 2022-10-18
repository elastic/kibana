/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const Panel = styled(EuiPanel)`
  overflow: hidden;
`;
Panel.displayName = 'Panel';

export interface EmbeddableProps {
  children: React.ReactNode;
}

export const Embeddable = React.memo<EmbeddableProps>(({ children }) => (
  <section className="siemEmbeddable" data-test-subj="siemEmbeddable">
    <Panel paddingSize="none" hasBorder>
      {children}
    </Panel>
  </section>
));
Embeddable.displayName = 'Embeddable';
