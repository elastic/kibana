/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { jobCompletionNotifications } from '../../../../../../plugins/reporting/public';
import { getWorkpad, getPages } from '../../../state/selectors/workpad';
import { getWindow } from '../../../lib/get_window';
import { downloadWorkpad } from '../../../lib/download_workpad';
import { ShareMenu as Component, Props as ComponentProps } from './share_menu';
import { getPdfUrl, createPdf } from './utils';
import { State, CanvasWorkpad } from '../../../../types';
import { withKibana } from '../../../../../../../src/plugins/kibana_react/public/';
import { WithKibanaProps } from '../../../index';

import { ComponentStrings } from '../../../../i18n';

const { WorkpadHeaderShareMenu: strings } = ComponentStrings;

const mapStateToProps = (state: State) => ({
  workpad: getWorkpad(state),
  pageCount: getPages(state).length,
});

const getAbsoluteUrl = (path: string) => {
  const { location } = getWindow();

  if (!location) {
    return path;
  } // fallback for mocked window object

  const { protocol, hostname, port } = location;
  return `${protocol}//${hostname}:${port}${path}`;
};

interface Props {
  workpad: CanvasWorkpad;
  pageCount: number;
}

export const ShareMenu = compose<ComponentProps, {}>(
  connect(mapStateToProps),
  withKibana,
  withProps(
    ({ workpad, pageCount, kibana }: Props & WithKibanaProps): ComponentProps => ({
      getExportUrl: (type) => {
        if (type === 'pdf') {
          const pdfUrl = getPdfUrl(workpad, { pageCount }, kibana.services.http.basePath);
          return getAbsoluteUrl(pdfUrl);
        }

        throw new Error(strings.getUnknownExportErrorMessage(type));
      },
      onCopy: (type) => {
        switch (type) {
          case 'pdf':
            kibana.services.canvas.notify.info(strings.getCopyPDFMessage());
            break;
          case 'reportingConfig':
            kibana.services.canvas.notify.info(strings.getCopyReportingConfigMessage());
            break;
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
      onExport: (type) => {
        switch (type) {
          case 'pdf':
            return createPdf(workpad, { pageCount }, kibana.services.http.basePath)
              .then(({ data }: { data: { job: { id: string } } }) => {
                kibana.services.canvas.notify.info(strings.getExportPDFMessage(), {
                  title: strings.getExportPDFTitle(workpad.name),
                });

                // register the job so a completion notification shows up when it's ready
                jobCompletionNotifications.add(data.job.id);
              })
              .catch((err: Error) => {
                kibana.services.canvas.notify.error(err, {
                  title: strings.getExportPDFErrorTitle(workpad.name),
                });
              });
          case 'json':
            downloadWorkpad(workpad.id);
            return;
          default:
            throw new Error(strings.getUnknownExportErrorMessage(type));
        }
      },
    })
  )
)(Component);
