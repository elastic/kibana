/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { NoDataLayout } from '../../../components/layouts/no_data';
import { WalkthroughLayout } from '../../../components/layouts/walkthrough';
import { ChildRoutes } from '../../../components/navigation/child_routes';
import { ConnectedLink } from '../../../components/navigation/connected_link';
import { AppPageProps } from '../../../frontend_types';

type Props = AppPageProps & {
  intl: InjectedIntl;
};

const InitialWalkthroughPageComponent: React.FC<Props> = (props) => {
  if (props.location.pathname === '/walkthrough/initial') {
    return (
      <NoDataLayout
        title={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>{'Beats central management '}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.beatsManagement.walkthrough.initial.betaBadgeText', {
                  defaultMessage: 'Beta',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        actionSection={
          <ConnectedLink path="/walkthrough/initial/beat">
            <EuiButton color="primary" fill>
              <FormattedMessage
                id="xpack.beatsManagement.enrollBeat.enrollBeatButtonLabel"
                defaultMessage="Enroll Beat"
              />{' '}
            </EuiButton>
          </ConnectedLink>
        }
      >
        <p>
          <FormattedMessage
            id="xpack.beatsManagement.enrollBeat.beatsCentralManagementDescription"
            defaultMessage="Manage your configurations in a central location."
          />
        </p>
      </NoDataLayout>
    );
  }
  return (
    <WalkthroughLayout
      title={props.intl.formatMessage({
        id: 'xpack.beatsManagement.enrollBeat.getStartedBeatsCentralManagementTitle',
        defaultMessage: 'Get started with Beats central management',
      })}
      walkthroughSteps={[
        {
          id: '/walkthrough/initial/beat',
          name: props.intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.enrollBeatStepLabel',
            defaultMessage: 'Enroll Beat',
          }),
        },
        {
          id: '/walkthrough/initial/tag',
          name: props.intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.createTagStepLabel',
            defaultMessage: 'Create tag',
          }),
        },
        {
          id: '/walkthrough/initial/finish',
          name: props.intl.formatMessage({
            id: 'xpack.beatsManagement.enrollBeat.finishStepLabel',
            defaultMessage: 'Finish',
          }),
        },
      ]}
      goTo={() => {
        // FIXME implament goto
      }}
      activePath={props.location.pathname}
    >
      <ChildRoutes routes={props.routes} {...props} />
    </WalkthroughLayout>
  );
};

export const InitialWalkthroughPage = injectI18n(InitialWalkthroughPageComponent);
