/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiIcon, EuiToolTip } from '@elastic/eui';
import { startCase } from 'lodash';
import { useEuiTheme } from '../../../hooks';
import {
  KubernetesCollectionMap,
  KubernetesCollection,
  TreeViewIconProps,
  KubernetesTreeViewLevels,
} from '../../../types';
import { useStyles } from './styles';
import { KUBERNETES_COLLECTION_ICONS_PROPS } from '../helpers';
import { showBreadcrumbDisplayText } from './helper';
interface BreadcrumbDeps {
  treeNavSelection: Partial<KubernetesCollectionMap>;
  onSelect: (selection: Partial<KubernetesCollectionMap>) => void;
}

export const Breadcrumb = ({ treeNavSelection, onSelect }: BreadcrumbDeps) => {
  const styles = useStyles();
  const { euiVars } = useEuiTheme();
  const onBreadCrumbClick = useCallback(
    (collectionType: KubernetesCollection) => {
      const selectionCopy = { ...treeNavSelection };
      switch (collectionType) {
        case KubernetesTreeViewLevels.clusterId: {
          onSelect({
            clusterId: treeNavSelection.clusterId,
            clusterName: treeNavSelection.clusterName,
          });
          break;
        }
        case KubernetesTreeViewLevels.namespace:
        case KubernetesTreeViewLevels.node: {
          delete selectionCopy.pod;
          delete selectionCopy.containerImage;
          onSelect(selectionCopy);
          break;
        }
        case KubernetesTreeViewLevels.pod: {
          delete selectionCopy.containerImage;
          onSelect(selectionCopy);
          break;
        }
      }
    },
    [onSelect, treeNavSelection]
  );

  const renderBreadcrumbLink = useCallback(
    (
      collectionType: KubernetesCollection,
      treeViewIconProps: TreeViewIconProps,
      isBolded: boolean,
      hasRightArrow: boolean = true
    ) => {
      const clusterLevel =
        collectionType === KubernetesTreeViewLevels.clusterId
          ? 'Cluster'
          : startCase(collectionType);
      const content =
        collectionType === KubernetesTreeViewLevels.clusterId
          ? treeNavSelection.clusterName || treeNavSelection.clusterId
          : treeNavSelection[collectionType];

      const tooltip = `${clusterLevel}: ${content}`;
      const showBreadcrumbText = showBreadcrumbDisplayText(treeNavSelection, collectionType);
      const { type: iconType, euiVarColor } = treeViewIconProps;

      return (
        <>
          {hasRightArrow && <EuiIcon css={styles.breadcrumbRightIcon} type="arrowRight" size="s" />}
          <EuiToolTip content={tooltip}>
            <EuiButtonIcon
              data-test-subj={`kubernetesSecurityBreadcrumbIcon-${collectionType}`}
              iconType={iconType}
              style={{ color: euiVars[euiVarColor] }}
              aria-label={`Click ${clusterLevel} breadcrumb`}
              onClick={() => onBreadCrumbClick(collectionType)}
            />
          </EuiToolTip>
          {showBreadcrumbText && (
            <EuiToolTip content={tooltip}>
              <EuiButtonEmpty
                css={isBolded ? styles.breadcrumbButtonBold : styles.breadcrumbButton}
                color="text"
                onClick={() => onBreadCrumbClick(collectionType)}
              >
                {content}
              </EuiButtonEmpty>
            </EuiToolTip>
          )}
        </>
      );
    },
    [
      onBreadCrumbClick,
      styles.breadcrumbButton,
      styles.breadcrumbButtonBold,
      styles.breadcrumbRightIcon,
      treeNavSelection,
      euiVars,
    ]
  );

  if (!treeNavSelection.clusterId) {
    return null;
  }

  return (
    <div css={styles.breadcrumb}>
      {renderBreadcrumbLink(
        KubernetesTreeViewLevels.clusterId,
        KUBERNETES_COLLECTION_ICONS_PROPS.clusterId,
        !(treeNavSelection.namespace || treeNavSelection.node),
        false
      )}
      {treeNavSelection.namespace &&
        renderBreadcrumbLink(
          KubernetesTreeViewLevels.namespace,
          KUBERNETES_COLLECTION_ICONS_PROPS.namespace,
          !treeNavSelection.pod
        )}
      {treeNavSelection.node &&
        renderBreadcrumbLink(
          KubernetesTreeViewLevels.node,
          KUBERNETES_COLLECTION_ICONS_PROPS.node,
          !treeNavSelection.pod
        )}
      {treeNavSelection.pod &&
        renderBreadcrumbLink(
          KubernetesTreeViewLevels.pod,
          KUBERNETES_COLLECTION_ICONS_PROPS.pod,
          !treeNavSelection.containerImage
        )}
      {treeNavSelection.containerImage &&
        renderBreadcrumbLink(
          KubernetesTreeViewLevels.containerImage,
          KUBERNETES_COLLECTION_ICONS_PROPS.containerImage,
          true
        )}
    </div>
  );
};
