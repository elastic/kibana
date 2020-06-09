/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { pickBy } from 'lodash/fp';
import React from 'react';
import styled, { css } from 'styled-components';

import { useLocation } from 'react-router-dom';
import { gutterTimeline } from '../../lib/helpers';
import { navTabs } from '../../../app/home/home_navigations';
import { SiemPageName } from '../../../app/types';
import { getOverviewUrl } from '../link_to';
import { MlPopover } from '../ml_popover/ml_popover';
import { SiemNavigation } from '../navigation';
import * as i18n from './translations';
import { useWithSource } from '../../containers/source';
import { ADD_DATA_PATH } from '../../../../common/constants';

const Wrapper = styled.header`
  ${({ theme }) => css`
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    padding: ${theme.eui.paddingSizes.m} ${gutterTimeline} ${theme.eui.paddingSizes.m}
      ${theme.eui.paddingSizes.l};
  `}
`;
Wrapper.displayName = 'Wrapper';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;
FlexItem.displayName = 'FlexItem';

interface HeaderGlobalProps {
  hideDetectionEngine?: boolean;
}
export const HeaderGlobal = React.memo<HeaderGlobalProps>(({ hideDetectionEngine = false }) => {
  const currentLocation = useLocation();
  const { indicesExist } = useWithSource();

  return (
    <Wrapper className="siemHeaderGlobal">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <>
          <FlexItem>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <FlexItem grow={false}>
                <EuiLink href={getOverviewUrl()}>
                  <EuiIcon aria-label={i18n.SIEM} type="securityAnalyticsApp" size="l" />
                </EuiLink>
              </FlexItem>

              <FlexItem component="nav">
                {indicesExist ? (
                  <SiemNavigation
                    display="condensed"
                    navTabs={
                      hideDetectionEngine
                        ? pickBy((_, key) => key !== SiemPageName.detections, navTabs)
                        : navTabs
                    }
                  />
                ) : (
                  <SiemNavigation
                    display="condensed"
                    navTabs={pickBy((_, key) => key === SiemPageName.overview, navTabs)}
                  />
                )}
              </FlexItem>
            </EuiFlexGroup>
          </FlexItem>

          <FlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              {indicesExist && currentLocation.pathname.includes(`/${SiemPageName.detections}/`) && (
                <FlexItem grow={false}>
                  <MlPopover />
                </FlexItem>
              )}

              <FlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="add-data"
                  href={ADD_DATA_PATH}
                  iconType="plusInCircle"
                >
                  {i18n.BUTTON_ADD_DATA}
                </EuiButtonEmpty>
              </FlexItem>
            </EuiFlexGroup>
          </FlexItem>
        </>
      </EuiFlexGroup>
    </Wrapper>
  );
});
HeaderGlobal.displayName = 'HeaderGlobal';
