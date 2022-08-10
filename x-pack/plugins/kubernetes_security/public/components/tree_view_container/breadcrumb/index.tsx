/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiIcon, EuiToolTip } from '@elastic/eui';
import { TreeNavSelection, KubernetesCollection } from '../../../types';
import { useStyles } from './styles';
import { TreeViewIcon } from '../tree_view_icon';
import { KUBERNETES_COLLECTION_ICONS_PROPS } from '../helpers';

interface BreadcrumbDeps {
  treeNavSelection: TreeNavSelection;
  onSelect: (selection: TreeNavSelection) => void;
}

export const Breadcrumb = ({ treeNavSelection, onSelect }: BreadcrumbDeps) => {
  const styles = useStyles();
  const onBreadCrumbClick = useCallback(
    (collectionType: string) => {
      const selectionCopy = { ...treeNavSelection };
      switch (collectionType) {
        case KubernetesCollection.clusterId: {
          onSelect({
            [KubernetesCollection.clusterId]: treeNavSelection[KubernetesCollection.clusterId],
            [KubernetesCollection.clusterName]: treeNavSelection[KubernetesCollection.clusterName],
          });
          break;
        }
        case KubernetesCollection.namespace:
        case KubernetesCollection.node: {
          delete selectionCopy[KubernetesCollection.pod];
          delete selectionCopy[KubernetesCollection.containerImage];
          onSelect(selectionCopy);
          break;
        }
        case KubernetesCollection.pod: {
          delete selectionCopy[KubernetesCollection.containerImage];
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
        collectionType === KubernetesCollection.clusterId
          ? treeNavSelection[KubernetesCollection.clusterName] ||
            treeNavSelection[KubernetesCollection.clusterId]
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

  if (!treeNavSelection[KubernetesCollection.clusterId]) {
    return null;
  }

  return (
    <div css={styles.breadcrumb}>
      {renderBreadcrumbLink(
        KubernetesCollection.clusterId,
        <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.clusterId} />,
        !(
          treeNavSelection[KubernetesCollection.namespace] ||
          treeNavSelection[KubernetesCollection.node]
        ),
        false
      )}
      {treeNavSelection[KubernetesCollection.namespace] &&
        renderBreadcrumbLink(
          KubernetesCollection.namespace,
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.namespace} />,
          !treeNavSelection[KubernetesCollection.pod]
        )}
      {treeNavSelection[KubernetesCollection.node] &&
        renderBreadcrumbLink(
          KubernetesCollection.node,
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.node} />,
          !treeNavSelection[KubernetesCollection.pod]
        )}
      {treeNavSelection[KubernetesCollection.pod] &&
        renderBreadcrumbLink(
          KubernetesCollection.pod,
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.pod} />,
          !treeNavSelection[KubernetesCollection.containerImage]
        )}
      {treeNavSelection[KubernetesCollection.containerImage] &&
        renderBreadcrumbLink(
          KubernetesCollection.containerImage,
          <TreeViewIcon {...KUBERNETES_COLLECTION_ICONS_PROPS.containerImage} />,
          true
        )}
    </div>
  );
};
