/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { useLink } from '../../../../../../../hooks';

const CenteredRoundedBottomBar = styled(EuiBottomBar)`
  max-width: 820px;
  margin: 0 auto;
  border-radius: 8px 8px 0px 0px;
`;
const NoAnimationCenteredRoundedBottomBar = styled(CenteredRoundedBottomBar)`
  animation-delay: -99s; #stop bottom bar flying in on step change
`;

export const NotObscuredByBottomBar = styled('div')`
  padding-bottom: 100px;
`;

export const CreatePackagePolicyBottomBar: React.FC<{
  isLoading?: boolean;
  isDisabled?: boolean;
  cancelClickHandler: React.ReactEventHandler;
  cancelUrl?: string;
  actionMessage: React.ReactElement;
  onNext: () => void;
  noAnimation?: boolean;
}> = ({
  isLoading,
  onNext,
  cancelClickHandler,
  cancelUrl,
  actionMessage,
  isDisabled = false,
  noAnimation = false,
}) => {
  const Bar = noAnimation ? NoAnimationCenteredRoundedBottomBar : CenteredRoundedBottomBar;
  return (
    <Bar>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButtonEmpty color="ghost" size="s" href={cancelUrl} onClick={cancelClickHandler}>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicyBottomBar.backButton"
                defaultMessage="Go back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            size="m"
            isDisabled={isDisabled}
            isLoading={!isDisabled && isLoading}
            onClick={onNext}
          >
            {isLoading ? (
              <FormattedMessage
                id="xpack.fleet.createPackagePolicyBottomBar.loading"
                defaultMessage="Loading..."
              />
            ) : (
              actionMessage
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Bar>
  );
};

export const CreatePackagePolicyFinalBottomBar: React.FC<{
  pkgkey: string;
}> = ({ pkgkey }) => {
  const { getHref } = useLink();
  return (
    <CenteredRoundedBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="ghost" size="s" href={getHref('integrations_all')}>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicyBottomBar.backButton"
                defaultMessage="Add another integration"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            fill
            size="m"
            href={getHref('integration_details_assets', {
              pkgkey,
            })}
          >
            <FormattedMessage
              id="xpack.fleet.confirmIncomingData.viewDataAssetsButtonText'"
              defaultMessage="View assets"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </CenteredRoundedBottomBar>
  );
};
