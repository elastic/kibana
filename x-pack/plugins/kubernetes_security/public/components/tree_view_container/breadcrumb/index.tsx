/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiIcon, EuiToolTip } from '@elastic/eui';
import { KubernetesCollectionMap, KubernetesCollection } from '../../../types';
import { useStyles } from './styles';
import { TreeViewIcon } from '../tree_view_icon';
import { KUBERNETES_COLLECTION_ICONS_PROPS } from '../helpers';

interface BreadcrumbDeps {
  treeNavSelection: Partial<KubernetesCollectionMap>;
  onSelect: (selection: Partial<KubernetesCollectionMap>) => void;
}

export const Breadcrumb = ({ treeNavSelection, onSelect }: BreadcrumbDeps) => {
  const styles = useStyles();
  const onBreadCrumbClick = useCallback(
    (collectionType: KubernetesCollection) => {
      const selectionCopy = { ...treeNavSelection };
      switch (collectionType) {
        case 'clusterId': {
          onSelect({
            clusterId: treeNavSelection.clusterId,
            clusterName: treeNavSelection.clusterName,
          });
          break;
        }
        case 'namespace':
        case 'node': {
          delete selectionCopy.pod;
          delete selectionCopy.containerImage;
          onSelect(selectionCopy);
          break;
        }
        case 'pod': {
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
      icon: JSX.Element,
      isBolded: boolean,
      hasRightArrow: boolean = true
    ) => {
      const content =
        collectionType === 'clusterId'
          ? treeNavSelection.clusterName || treeNavSelection.clusterId
          : treeNavSelection[collectionType];

      return (
        <>
          {hasRightArrow && <EuiIcon css={styles.breadcrumbRightIcon} type="arrowRight" size="s" />}
          {icon}
          <EuiToolTip content={content}>
            <EuiButtonEmpty
              css={isBolded ? styles.breadcrumbButtonBold : styles.breadcrumbButton}
              color="text"
              onClick={() => onBreadCrumbClick(collectionType)}
            >
              {content}
            </EuiButtonEmpty>
          </EuiToolTip>
        </>
      );
    },
    [
      onBreadCrumbClick,
      styles.breadcrumbButton,
      styles.breadcrumbButtonBold,
      styles.breadcrumbRightIcon,
      treeNavSelection,
    ]
  );

  if (!treeNavSelection.clusterId) {
    return null;
  }

  return (
    <div css={styles.breadcrumb}>
      {renderBreadcrumbLink(
        'clusterId',
        <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.clusterId} />,
        !(treeNavSelection.namespace || treeNavSelection.node),
        false
      )}
      {treeNavSelection.namespace &&
        renderBreadcrumbLink(
          'namespace',
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.namespace} />,
          !treeNavSelection.pod
        )}
      {treeNavSelection.node &&
        renderBreadcrumbLink(
          'node',
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.node} />,
          !treeNavSelection.pod
        )}
      {treeNavSelection.pod &&
        renderBreadcrumbLink(
          'pod',
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.pod} />,
          !treeNavSelection.containerImage
        )}
      {treeNavSelection.containerImage &&
        renderBreadcrumbLink(
          'containerImage',
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.containerImage} />,
          true
        )}
    </div>
  );
};
