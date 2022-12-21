/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EuiCode, EuiSpacer, EuiText, EuiCallOut, EuiLink } from '@elastic/eui';

import type { useComponentTemplatesContext } from '../../component_templates_context';
import { documentationService } from '../../../../services/documentation';
import type { Error } from '../../shared_imports';

interface Props {
  componentTemplatename: string;
  dataStreams: string[];
  onClose: () => void;
  api: ReturnType<typeof useComponentTemplatesContext>['api'];
}

export const MappingsDatastreamRolloverModal: React.FunctionComponent<Props> = ({
  componentTemplatename,
  dataStreams,
  onClose,
  api,
}) => {
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);

  const onConfirm = useCallback(() => {
    async function confirm() {
      try {
        setIsLoading(true);
        for (const dataStream of dataStreams) {
          await api.postDataStreamRollover(dataStream);
        }
        await onClose();
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    confirm();
  }, [api, onClose, dataStreams]);

  return (
    <EuiConfirmModal
      data-test-subj="mappingDatastreamRolloverModal"
      isLoading={isLoading}
      title={
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateEdit.mappingRolloverModalTitle"
          defaultMessage="Apply mappings now and rollover?"
        />
      }
      onCancel={onClose}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateMappingsRollover.cancelButton"
          defaultMessage="Apply on next rollover"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateMappingsRollover.confirmButtom"
          defaultMessage="Apply now and rollover"
        />
      }
    >
      {error && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateMappingsRollover.saveError"
                defaultMessage="Unable to apply rollover"
              />
            }
            color="danger"
            iconType="alert"
            data-test-subj="applyMappingsRolloverError"
          >
            <div>{error.message}</div>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiText>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateMappingsRollover.modalDescription"
          defaultMessage="New mappings for the {templateName} component template require a rollover for the following data streams: {datastreams} You can apply the new mappings to incoming data now and force a rollover, or wait until the next rollover. Rollover timing is defined by your index lifecycle policy. {moreInfoLink}"
          values={{
            templateName: <EuiCode>{componentTemplatename}</EuiCode>,
            moreInfoLink: (
              <EuiLink external={true} href={documentationService.docLinks.fleet.datastreamsILM}>
                <FormattedMessage
                  id="xpack.idxMgmt.componentTemplateEdit.moreInfoLink"
                  defaultMessage="See the documentation for more info."
                />
              </EuiLink>
            ),
            datastreams: (
              <>
                <EuiSpacer size="m" />
                <ul>
                  {dataStreams.map((dataStream) => (
                    <li>
                      <EuiCode>{dataStream}</EuiCode>
                    </li>
                  ))}
                </ul>
                <EuiSpacer size="s" />
              </>
            ),
          }}
        />
      </EuiText>
    </EuiConfirmModal>
  );
};
