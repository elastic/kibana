/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

import { EuiCheckbox, EuiSpacer } from '@elastic/eui';
import {
  CombinedField,
  CombinedFieldsReadOnlyForm,
} from '../../../common/components/combined_fields';
import { CreateDataViewToolTip } from './create_data_view_tooltip';
import { getIndexNameFormComponent } from '../../../../kibana_services';

interface Props {
  index: string;
  initialized: boolean;
  onIndexChange(): void;
  createDataView: boolean;
  onCreateDataViewChange(): void;
  indexNameError: string;
  combinedFields: CombinedField[];
  canCreateDataView: boolean;
}

export const SimpleSettings: FC<Props> = ({
  index,
  initialized,
  onIndexChange,
  createDataView,
  onCreateDataViewChange,
  indexNameError,
  combinedFields,
  canCreateDataView,
}) => {
  const IndexNameForm = getIndexNameFormComponent();

  return (
    <React.Fragment>
      <IndexNameForm
        indexName={index}
        indexNameError={indexNameError}
        onIndexNameChange={onIndexChange}
        onIndexNameValidationStart={() => {}}
        onIndexNameValidationEnd={() => {}}
        data-test-subj="dataVisualizerFileIndexNameInput"
      />

      <EuiSpacer size="m" />

      <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
        <EuiCheckbox
          id="createDataView"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.simpleImportSettings.createDataViewLabel"
              defaultMessage="Create data view"
            />
          }
          checked={createDataView === true}
          disabled={initialized === true || canCreateDataView === false}
          onChange={onCreateDataViewChange}
          data-test-subj="dataVisualizerFileCreateDataViewCheckbox"
        />
      </CreateDataViewToolTip>

      <EuiSpacer size="m" />

      <CombinedFieldsReadOnlyForm combinedFields={combinedFields} />
    </React.Fragment>
  );
};
