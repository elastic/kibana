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
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { i18n } from '@kbn/i18n';

import type { AppMountParameters } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { MlPopover } from '../../../common/components/ml_popover/ml_popover';
import { useKibana } from '../../../common/lib/kibana';
import { isDetectionsPath } from '../../../helpers';
import { Sourcerer } from '../../../common/components/sourcerer';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { getScopeFromPath, showSourcererByPath } from '../../../common/containers/sourcerer';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';
import { AssistantHeaderLink } from './assistant_header_link';

const BUTTON_ADD_DATA = i18n.translate('xpack.securitySolution.globalHeader.buttonAddData', {
  defaultMessage: 'Add integrations',
});

/**
 * This component uses the reverse portal to add the Add Data, ML job settings, and AI Assistant buttons on the
 * right hand side of the Kibana global header
 */
export const GlobalHeader = React.memo(
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => {
    const portalNode = useMemo(() => createHtmlPortalNode(), []);
    const { theme } = useKibana().services;
    const { pathname } = useLocation();

    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const showTimeline = useShallowEqualSelector(
      (state) => (getTimeline(state, TimelineId.active) ?? timelineDefaults).show
    );

    const sourcererScope = getScopeFromPath(pathname);
    const showSourcerer = showSourcererByPath(pathname);

    const { href, onClick } = useAddIntegrationsUrl();

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
                onClick={onClick}
              >
                {BUTTON_ADD_DATA}
              </EuiHeaderLink>
              {showSourcerer && !showTimeline && (
                <Sourcerer scope={sourcererScope} data-test-subj="sourcerer" />
              )}
              <AssistantHeaderLink />
            </EuiHeaderLinks>
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </InPortal>
    );
  }
);
GlobalHeader.displayName = 'GlobalHeader';
