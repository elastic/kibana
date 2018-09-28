/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Datatable } from '../../datatable';
import { Error } from '../../error';

export const DatasourcePreview = ({ done, datatable }) => (
  <EuiOverlayMask>
    <EuiModal onClose={done} maxWidth="1000px">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.canvas.datasource.previewHeaderTitle"
            defaultMessage="Datasource Preview"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="canvasDatasourcePreview">
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.canvas.datasource.previewModalDescription"
              defaultMessage="Click {strongSave} in the sidebar to use this data"
              values={{
                strongSave: (
                  <strong>
                    <FormattedMessage
                      id="xpack.canvas.datasource.previewModalStrongSaveLabel"
                      defaultMessage="Save"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiText>
        {datatable.type === 'error' ? (
          <Error payload={datatable} />
        ) : (
          <EuiPanel className="canvasDatasourcePreview__panel">
            {datatable.rows.length > 0 ? (
              <Datatable datatable={datatable} showHeader paginate />
            ) : (
              <EuiEmptyPrompt
                title={
                  <h2>
                    <FormattedMessage
                      id="xpack.canvas.datasource.noDocumentFoundHeaderTitle"
                      defaultMessage="No documents found"
                    />
                  </h2>
                }
                titleSize="s"
                body={
                  <p>
                    <FormattedMessage
                      id="xpack.canvas.datasource.noDocumentFoundDescription"
                      defaultMessage="We couldn't find any documents matching your search criteria.
                      {br} Check your datasource settings and try again."
                      values={{ br: <br /> }}
                    />
                  </p>
                }
              />
            )}
          </EuiPanel>
        )}
      </EuiModalBody>
    </EuiModal>
  </EuiOverlayMask>
);

DatasourcePreview.propTypes = {
  datatable: PropTypes.object,
  done: PropTypes.func,
};
