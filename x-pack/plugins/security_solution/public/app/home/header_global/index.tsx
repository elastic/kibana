/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHeaderSection,
  EuiHeaderLinks,
  EuiHeaderLink,
  EuiHeaderSectionItem,
} from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { createPortalNode, OutPortal, InPortal } from 'react-reverse-portal';

import { AppMountParameters } from '../../../../../../../src/core/public';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { MlPopover } from '../../../common/components/ml_popover/ml_popover';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH, APP_DETECTIONS_PATH } from '../../../../common/constants';

export const HeaderGlobal = React.memo(
  ({ setHeaderActionMenu }: { setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'] }) => {
    const portalNode = useMemo(() => createPortalNode(), []);
    const { http } = useKibana().services;

    useEffect(() => {
      let unmount = () => {};

      setHeaderActionMenu((element) => {
        const mount = toMountPoint(<OutPortal node={portalNode} />);
        unmount = mount(element);
        return unmount;
      });

      return () => {
        portalNode.unmount();
        unmount();
      };
    }, [portalNode, setHeaderActionMenu]);

    const basePath = http.basePath.get();
    return (
      <InPortal node={portalNode}>
        <EuiHeaderSection side="right">
          {window.location.pathname.includes(APP_DETECTIONS_PATH) && (
            <EuiHeaderSectionItem>
              <MlPopover />
            </EuiHeaderSectionItem>
          )}
          <EuiHeaderSectionItem>
            <EuiHeaderLinks>
              <EuiHeaderLink
                color="primary"
                data-test-subj="add-data"
                href={`${basePath}${ADD_DATA_PATH}`}
                iconType="indexOpen"
              >
                {i18n.BUTTON_ADD_DATA}
              </EuiHeaderLink>
            </EuiHeaderLinks>
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </InPortal>
    );
  }
);
HeaderGlobal.displayName = 'HeaderGlobal';
