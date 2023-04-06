/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiTitle,
  EuiEmptyPrompt,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { EMPTY_STATE_TEST_SUBJ } from './test_subjects';
import illustration from '../assets/illustrations/illustration_product_no_results_magnifying_glass.svg';

export const EmptyState: React.FC = () => {
  return (
    <EuiEmptyPrompt
      data-test-subj={EMPTY_STATE_TEST_SUBJ}
      icon={<EuiImage size="290" url={illustration} alt="" />}
      title={
        <h2>
          <FormattedMessage
            id="xpack.cloudSecurityPosture.emptyState.title"
            defaultMessage="No results match your search criteria"
          />
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.cloudSecurityPosture.emptyState.description"
              defaultMessage="Try modifying your search or filter set"
            />
          </p>
        </>
      }
      actions={[
        <EuiButton color="primary" fill>
          <FormattedMessage
            id="xpack.cloudSecurityPosture.emptyState.resetFiltersButton"
            defaultMessage="Reset filters"
          />
        </EuiButton>,
        <EuiLink href="#" target="_blank">
          <FormattedMessage
            id="xpack.cloudSecurityPosture.emptyState.readDocsLink"
            defaultMessage="Read the docs"
          />
        </EuiLink>,
      ]}
    />
    // <EuiFlexGroup
    //   data-test-subj={EMPTY_STATE_TEST_SUBJ}
    //   css={css`
    //     height: 254px;
    //   `}
    //   alignItems="center"
    //   justifyContent="center"
    // >
    //   <EuiFlexItem grow={false}>
    //     <EuiPanel
    //       hasBorder={true}
    //       css={css`
    //         max-width: 734px;
    //       `}
    //     >
    //       <EuiFlexGroup>
    //         <EuiFlexItem>
    //           <EuiText size="s">
    //             <EuiTitle>
    //               <h3>
    //                 <FormattedMessage
    //                   id="xpack.kubernetesSecurity.treeView.empty.title"
    //                   defaultMessage="No results match your search criteria"
    //                 />
    //               </h3>
    //             </EuiTitle>
    //             <p>
    //               <FormattedMessage
    //                 id="xpack.kubernetesSecurity.treeView.empty.description"
    //                 defaultMessage="Try modifying your search or filter set"
    //               />
    //             </p>
    //           </EuiText>
    //         </EuiFlexItem>
    //         <EuiFlexItem grow={false}>
    //           <EuiImage size="200" alt="" url={icon} />
    //         </EuiFlexItem>
    //       </EuiFlexGroup>
    //     </EuiPanel>
    //   </EuiFlexItem>
    // </EuiFlexGroup>
  );
};
