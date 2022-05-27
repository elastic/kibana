/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHeaderLink,
  EuiHeaderLinks,
  EuiHeaderSection,
  EuiHeaderSectionItem,
} from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { i18n } from '@kbn/i18n';

import { AppMountParameters } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { MlPopover } from '../../../common/components/ml_popover/ml_popover';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { isDetectionsPath } from '../../../helpers';
import { Sourcerer } from '../../../common/components/sourcerer';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getScopeFromPath, showSourcererByPath } from '../../../common/containers/sourcerer';

const BUTTON_ADD_DATA = i18n.translate('xpack.securitySolution.globalHeader.buttonAddData', {
  defaultMessage: 'Add integrations',
});

/**
 * This component uses the reverse portal to add the Add Data and ML job settings buttons on the
 * right hand side of the Kibana global header
 */
export const GlobalHeader = React.memo(
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => {
    const portalNode = useMemo(() => createPortalNode(), []);
    const {
      theme,
      http: {
        basePath: { prepend },
      },
    } = useKibana().services;
    const { pathname } = useLocation();

    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const showTimeline = useShallowEqualSelector(
      (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).show
    );

    const sourcererScope = getScopeFromPath(pathname);
    const showSourcerer = showSourcererByPath(pathname);

    const href = useMemo(() => prepend(ADD_DATA_PATH), [prepend]);

    useEffect(() => {
      setHeaderActionMenu((element) => {
        const mount = toMountPoint(<OutPortal node={portalNode} />, { theme$: theme.theme$ });
        return mount(element);
      });

      return () => {
        portalNode.unmount();
        setHeaderActionMenu(undefined);
      };
    }, [portalNode, setHeaderActionMenu, theme.theme$]);

    return (
      <InPortal node={portalNode}>
        <EuiHeaderSection side="right">
          {isDetectionsPath(pathname) && (
            <EuiHeaderSectionItem>
              <MlPopover />
            </EuiHeaderSectionItem>
          )}

          <EuiHeaderSectionItem>
            <EuiHeaderLinks>
              <EuiHeaderLink
                color="primary"
                data-test-subj="add-data"
                href={href}
                iconType="indexOpen"
              >
                {BUTTON_ADD_DATA}
              </EuiHeaderLink>
              {showSourcerer && !showTimeline && (
                <Sourcerer scope={sourcererScope} data-test-subj="sourcerer" />
              )}
            </EuiHeaderLinks>
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </InPortal>
    );
  }
);
GlobalHeader.displayName = 'GlobalHeader';
