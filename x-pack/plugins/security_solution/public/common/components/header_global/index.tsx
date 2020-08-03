/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { pickBy } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { OutPortal } from 'react-reverse-portal';

import { gutterTimeline } from '../../lib/helpers';
import { navTabs } from '../../../app/home/home_navigations';
import { useFullScreen } from '../../containers/use_full_screen';
import { SecurityPageName } from '../../../app/types';
import { getAppOverviewUrl } from '../link_to';
import { MlPopover } from '../ml_popover/ml_popover';
import { SiemNavigation } from '../navigation';
import * as i18n from './translations';
import { useWithSource } from '../../containers/source';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { useKibana } from '../../lib/kibana';
import { APP_ID, ADD_DATA_PATH, APP_DETECTIONS_PATH } from '../../../../common/constants';
import { useGlobalHeaderPortal } from '../../hooks/use_global_header_portal';
import { LinkAnchor } from '../links';

const Wrapper = styled.header<{ $globalFullScreen: boolean }>`
  ${({ $globalFullScreen, theme }) => `
    background: ${theme.eui.euiColorEmptyShade};
    border-bottom: ${theme.eui.euiBorderThin};
    padding-top: ${$globalFullScreen ? theme.eui.paddingSizes.s : theme.eui.paddingSizes.m};
    width: 100%;
    z-index: ${theme.eui.euiZNavigation};
  `}
`;
Wrapper.displayName = 'Wrapper';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;
FlexItem.displayName = 'FlexItem';

const FlexGroup = styled(EuiFlexGroup)<{ $globalFullScreen: boolean }>`
  ${({ $globalFullScreen, theme }) => `
    border-bottom: ${theme.eui.euiBorderThin};
    margin-bottom: 1px;
    padding-bottom: 4px;
    padding-left: ${theme.eui.paddingSizes.l};
    padding-right: ${gutterTimeline};
    ${$globalFullScreen ? 'display: none;' : ''}
  `}
`;
FlexGroup.displayName = 'FlexGroup';

interface HeaderGlobalProps {
  hideDetectionEngine?: boolean;
}
export const HeaderGlobal = React.memo<HeaderGlobalProps>(({ hideDetectionEngine = false }) => {
  const { indicesExist } = useWithSource();
  const { globalHeaderPortalNode } = useGlobalHeaderPortal();
  const { globalFullScreen } = useFullScreen();
  const search = useGetUrlSearch(navTabs.overview);
  const { navigateToApp } = useKibana().services.application;
  const goToOverview = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, { path: search });
    },
    [navigateToApp, search]
  );

  return (
    <Wrapper className="siemHeaderGlobal" $globalFullScreen={globalFullScreen}>
      <FlexGroup
        alignItems="center"
        $globalFullScreen={globalFullScreen}
        justifyContent="spaceBetween"
        wrap
      >
        <>
          <FlexItem>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <FlexItem grow={false}>
                <LinkAnchor onClick={goToOverview} href={getAppOverviewUrl(search)}>
                  <EuiIcon aria-label={i18n.SECURITY_SOLUTION} type="logoSecurity" size="l" />
                </LinkAnchor>
              </FlexItem>

              <FlexItem component="nav">
                <SiemNavigation
                  display="condensed"
                  navTabs={
                    hideDetectionEngine
                      ? pickBy((_, key) => key !== SecurityPageName.detections, navTabs)
                      : navTabs
                  }
                />
              </FlexItem>
            </EuiFlexGroup>
          </FlexItem>

          <FlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              {indicesExist && window.location.pathname.includes(APP_DETECTIONS_PATH) && (
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
      </FlexGroup>
      <div>
        <OutPortal node={globalHeaderPortalNode} />
      </div>
    </Wrapper>
  );
});
HeaderGlobal.displayName = 'HeaderGlobal';
