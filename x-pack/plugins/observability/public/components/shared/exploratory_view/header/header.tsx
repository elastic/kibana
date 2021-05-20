/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import {
  getLastKnownDoc,
  SavedModalLazy,
  runSaveLensVisualization,
  TypedLensByValueInput,
} from '../../../../../../lens/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { DataViewLabels } from '../configurations/constants';
import { useUrlStorage } from '../hooks/use_url_storage';
import { ObservabilityAppServices } from '../../../../application/types';

interface Props {
  seriesId: string;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ seriesId, lensAttributes }: Props) {
  const kServices = useKibana<ObservabilityAppServices>().services;

  const { chrome, lens, data, notifications, presentationUtil } = kServices;

  const { series } = useUrlStorage(seriesId);

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [lastKnownDoc, setLastKnownDoc] = useState();
  const [attributeService, setAttributeService] = useState();

  const { ContextProvider: PresentationUtilContext } = presentationUtil;

  useEffect(() => {
    if (isSaveOpen && lensAttributes !== null) {
      async function loadLastKnownDoc() {
        const attributeServiceT = await lens.attributeService();
        setAttributeService(attributeServiceT);
        getLastKnownDoc({
          data,
          chrome: chrome!,
          notifications: notifications!,
          attributeService: attributeServiceT,
          initialInput: lensAttributes,
        }).then((result) => {
          setLastKnownDoc(result.lastKnownDoc);
        });
      }

      loadLastKnownDoc();
    }
  }, [chrome, data, isSaveOpen, lens, lensAttributes, notifications]);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText>
            <h2>
              {DataViewLabels[series.reportType] ??
                i18n.translate('xpack.observability.expView.heading.label', {
                  defaultMessage: 'Analyze data',
                })}{' '}
              <EuiBetaBadge
                style={{
                  verticalAlign: `middle`,
                }}
                label={i18n.translate('xpack.observability.expView.heading.experimental', {
                  defaultMessage: 'Experimental',
                })}
              />
            </h2>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="lensApp"
            fullWidth={false}
            isDisabled={!lens.canUseEditor() || lensAttributes === null}
            onClick={() => {
              if (lensAttributes) {
                lens.navigateToPrefilledEditor(
                  {
                    id: '',
                    timeRange: series.time,
                    attributes: lensAttributes,
                  },
                  true
                );
              }
            }}
          >
            {i18n.translate('xpack.observability.expView.heading.openInLens', {
              defaultMessage: 'Open in Lens',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="save"
            fullWidth={false}
            isDisabled={!lens.canUseEditor() || lensAttributes === null}
            onClick={() => {
              if (lensAttributes) {
                setIsSaveOpen(true);
              }
            }}
          >
            {i18n.translate('xpack.observability.expView.heading.openInLens', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {lastKnownDoc && (
        <PresentationUtilContext>
          <SavedModalLazy
            isVisible={isSaveOpen}
            lastKnownDoc={lastKnownDoc}
            onClose={() => {
              setIsSaveOpen(false);
            }}
            onSave={(saveProps, options) => {
              runSaveLensVisualization(
                {
                  lastKnownDoc,
                  setIsSaveModalVisible: () => {
                    setIsSaveOpen(false);
                  },
                  initialInput: lensAttributes,
                  attributeService,
                  getIsByValueMode: () => false,
                  ...kServices,
                },
                saveProps,
                options
              );
            }}
            persistedDoc={undefined}
            savingToLibraryPermitted={true}
            returnToOriginSwitchLabel={true}
            originatingApp={undefined}
          />
        </PresentationUtilContext>
      )}
    </>
  );
}
