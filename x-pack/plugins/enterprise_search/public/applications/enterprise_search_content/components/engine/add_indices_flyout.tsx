/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelectable,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const AddIndicesFlyout: React.FC = ({ onClose }) => {
  // const { searchIndices, setIndicesToAdd, submitIndicesToAdd } = useActions(EngineIndicesLogic);
  // const { indicesOptions /* isLoadingIndices */ } = useValues(EngineIndicesLogic);

  // useEffect(() => {
  //   searchIndices();
  // }, []);

  const indicesOptions = [];

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.title',
              { defaultMessage: 'Add new indices' }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.selectableLabel',
            { defaultMessage: 'Select searchable indices' }
          )}
        >
          <EuiSelectable searchable options={indicesOptions}>
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" direction="rowReverse">
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircle" onClick={() => {}}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.submitButton',
                { defaultMessage: 'Add selected' }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={onClose}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.cancelButton',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
