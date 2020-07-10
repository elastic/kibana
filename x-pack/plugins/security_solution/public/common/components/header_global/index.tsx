/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { pickBy } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';

import { gutterTimeline } from '../../lib/helpers';
import { navTabs } from '../../../app/home/home_navigations';
import { SecurityPageName } from '../../../app/types';
import { getAppOverviewUrl } from '../link_to';
import { MlPopover } from '../ml_popover/ml_popover';
import { SiemNavigation } from '../navigation';
import * as i18n from './translations';
import { useWithSource } from '../../containers/source';
import { useGetUrlSearch } from '../navigation/use_get_url_search';
import { useKibana } from '../../lib/kibana';
import { APP_ID, ADD_DATA_PATH, APP_DETECTIONS_PATH } from '../../../../common/constants';
import { LinkAnchor } from '../links';

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
  const { indicesExist } = useWithSource();
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
    <Wrapper className="siemHeaderGlobal">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
        <>
          <FlexItem>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <FlexItem grow={false}>
                <LinkAnchor onClick={goToOverview} href={getAppOverviewUrl(search)}>
                  <EuiIcon aria-label={i18n.SIEM} type="logoSecurity" size="l" />
                </LinkAnchor>
              </FlexItem>

              <FlexItem component="nav">
                {indicesExist ? (
                  <SiemNavigation
                    display="condensed"
                    navTabs={
                      hideDetectionEngine
                        ? pickBy((_, key) => key !== SecurityPageName.detections, navTabs)
                        : navTabs
                    }
                  />
                ) : (
                  <SiemNavigation
                    display="condensed"
                    navTabs={pickBy((_, key) => key === SecurityPageName.overview, navTabs)}
                  />
                )}
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
      </EuiFlexGroup>
    </Wrapper>
  );
});
HeaderGlobal.displayName = 'HeaderGlobal';
