/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import type { Embeddable } from '@kbn/lens-plugin/public';
// import type { SharePluginStart } from '@kbn/share-plugin/public';
// import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
// import type { LensPublicStart } from '@kbn/lens-plugin/public';.
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
// import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
// import { DataPublicPluginStart } from '@kbn/data-plugin/public';
// import { ChartsPluginStart } from '@kbn/charts-plugin/public';
// import { AddFieldFilterHandler } from '@kbn/unified-field-list-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  KibanaContextProvider,
  toMountPoint,
  wrapWithTheme,
} from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { from } from 'rxjs';
import { distinctUntilChanged, skip, takeUntil } from 'rxjs/operators';
import { StartServices } from '../../../contexts/kibana';
import { BonusContent } from './bonus_contents';

// import { UrlStateProvider } from './hooks/use_url_state';

// import { getMlGlobalServices } from '../../application/app';
// import { LensLayerSelectionFlyout } from './lens_vis_layer_selection_flyout';

export async function showBonusFlyout(
  processors: any,
  dataview: any,
  refreshModels: () => void,
  // embeddable: Embeddable,
  // field: DataViewField,
  // dataView: DataView,
  startServices: StartServices
  // data: DataPublicPluginStart,
  // charts: ChartsPluginStart,
  // onAddFilter?: AddFieldFilterHandler
  // share: SharePluginStart,
  // data: DataPublicPluginStart
  // lens: LensPublicStart
): Promise<void> {
  const {
    // http,
    theme: { theme$ },
    overlays,
    application: { currentAppId$ },
    // notifications,
    // uiSettings,
  } = startServices;

  return new Promise(async (resolve, reject) => {
    try {
      const onFlyoutClose = () => {
        flyoutSession.close();
        resolve();
      };

      // const appDependencies = { notifications, uiSettings, http, data, charts };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          wrapWithTheme(
            <KibanaContextProvider services={startServices}>
              <>
                {/* <EuiFlyout onClose={onFlyoutClose} data-test-subj="mlTestModelsFlyout" size={'m'}> */}
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="m">
                    <h2>
                      <FormattedMessage
                        id="xpack.ml.trainedModels.testModelsFlyout.headerLabel"
                        defaultMessage="Import model"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>
                  <BonusContent
                    refreshModels={refreshModels}
                    processors={processors}
                    dataview={dataview}
                  />
                </EuiFlyoutBody>
                {/* </EuiFlyout> */}
              </>
              ,
            </KibanaContextProvider>,
            theme$
          )
        ),
        {
          'data-test-subj': 'mlFlyoutLensLayerSelector',
          ownFocus: true,
          closeButtonAriaLabel: 'jobSelectorFlyout',
          onClose: onFlyoutClose,
          // @ts-ignore
          size: '600px',
        }
      );

      // Close the flyout when user navigates out of the current plugin
      currentAppId$
        .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
        .subscribe(() => {
          flyoutSession.close();
        });
    } catch (error) {
      reject(error);
    }
  });
}
