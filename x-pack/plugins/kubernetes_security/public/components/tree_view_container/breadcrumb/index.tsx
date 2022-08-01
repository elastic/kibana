/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiIcon } from '@elastic/eui';
import { TreeNavSelection, KubernetesCollection } from '../../../types';
import { useStyles } from './styles';

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
        case KubernetesCollection.cluster: {
          onSelect({
            [KubernetesCollection.cluster]: treeNavSelection[KubernetesCollection.cluster],
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
    ) => (
      <>
        {hasRightArrow && <EuiIcon css={styles.breadcrumbRightIcon} type="arrowRight" size="s" />}
        {icon}
        <EuiButtonEmpty
          css={isBolded ? styles.breadcrumbButtonBold : styles.breadcrumbButton}
          color="text"
          onClick={() => onBreadCrumbClick(collectionType)}
        >
          {treeNavSelection[collectionType]}
        </EuiButtonEmpty>
      </>
    ),
    [
      onBreadCrumbClick,
      styles.breadcrumbButton,
      styles.breadcrumbButtonBold,
      styles.breadcrumbRightIcon,
      treeNavSelection,
    ]
  );

  if (!treeNavSelection[KubernetesCollection.cluster]) {
    return null;
  }

  return (
    <div css={styles.breadcrumb}>
      {renderBreadcrumbLink(
        KubernetesCollection.cluster,
        <EuiIcon type="heatmap" color="success" />,
        !(
          treeNavSelection[KubernetesCollection.namespace] ||
          treeNavSelection[KubernetesCollection.node]
        ),
        false
      )}
      {treeNavSelection[KubernetesCollection.namespace] &&
        renderBreadcrumbLink(
          KubernetesCollection.namespace,
          <EuiIcon type="nested" color="primary" />,
          !treeNavSelection[KubernetesCollection.pod]
        )}
      {treeNavSelection[KubernetesCollection.node] &&
        renderBreadcrumbLink(
          KubernetesCollection.node,
          <EuiIcon type="node" color="primary" />,
          !treeNavSelection[KubernetesCollection.pod]
        )}
      {treeNavSelection[KubernetesCollection.pod] &&
        renderBreadcrumbLink(
          KubernetesCollection.pod,
          <EuiIcon type="package" color="warning" />,
          !treeNavSelection[KubernetesCollection.containerImage]
        )}
      {treeNavSelection[KubernetesCollection.containerImage] &&
        renderBreadcrumbLink(
          KubernetesCollection.containerImage,
          <EuiIcon type="image" color="danger" />,
          true
        )}
    </div>
  );
};
