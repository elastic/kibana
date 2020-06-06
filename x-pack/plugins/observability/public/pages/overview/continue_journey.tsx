/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EmptySection } from '../../components/empty_section';
import { ISection } from '../home/section';

interface Props {
  apps: ISection[];
}

export const ContinueJourney = ({ apps }: Props) => {
  return (
    <>
      <EuiTitle size="s">
        <h5>
          {i18n.translate('xpack.observability.continueJorney.title', {
            defaultMessage: 'Continue your Observability journey...',
          })}
        </h5>
      </EuiTitle>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGrid columns={2}>
        {apps.map((app) => {
          return (
            <EuiFlexItem key={app.id}>
              <EmptySection section={app} />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </>
  );
};
