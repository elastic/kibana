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
import { useLocation } from 'react-router-dom';
import { createPortalNode, OutPortal, InPortal } from 'react-reverse-portal';
import { i18n } from '@kbn/i18n';

import { AppMountParameters } from '../../../../../../../src/core/public';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { MlPopover } from '../../../common/components/ml_popover/ml_popover';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { isDetectionsPath } from '../../../../public/helpers';

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
      http: {
        basePath: { prepend },
      },
    } = useKibana().services;
    const { pathname } = useLocation();

    useEffect(() => {
      setHeaderActionMenu((element) => {
        const mount = toMountPoint(<OutPortal node={portalNode} />);
        return mount(element);
      });

      return () => {
        portalNode.unmount();
        setHeaderActionMenu(undefined);
      };
    }, [portalNode, setHeaderActionMenu]);

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
                href={prepend(ADD_DATA_PATH)}
                iconType="indexOpen"
              >
                {BUTTON_ADD_DATA}
              </EuiHeaderLink>
            </EuiHeaderLinks>
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </InPortal>
    );
  }
);
GlobalHeader.displayName = 'GlobalHeader';
