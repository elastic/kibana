/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { i18n } from '@kbn/i18n';

import { CanvasWorkpad, State } from '../../../../types';
import { downloadWorkpad } from '../../../lib/download_workpad';
import { withServices, WithServicesProps } from '../../../services';
import { getPages, getWorkpad } from '../../../state/selectors/workpad';
import { Props as ComponentProps, ShareMenu as Component } from './share_menu.component';

const strings = {
  getUnknownExportErrorMessage: (type: string) =>
    i18n.translate('xpack.canvas.workpadHeaderShareMenu.unknownExportErrorMessage', {
      defaultMessage: 'Unknown export type: {type}',
      values: {
        type,
      },
    }),
};

const mapStateToProps = (state: State) => ({
  workpad: getWorkpad(state),
  pageCount: getPages(state).length,
});

interface Props {
  workpad: CanvasWorkpad;
  pageCount: number;
}

export const ShareMenu = compose<ComponentProps, {}>(
  connect(mapStateToProps),
  withServices,
  withProps(
    ({ workpad, pageCount, services }: Props & WithServicesProps): ComponentProps => {
      const {
        reporting: { start: reporting },
      } = services;

      return {
        sharingServices: { reporting },
        sharingData: { workpad, pageCount },
        onExport: (type) => {
          switch (type) {
            case 'pdf':
              // notifications are automatically handled by the Reporting plugin
              break;
            case 'json':
              downloadWorkpad(workpad.id);
              return;
            default:
              throw new Error(strings.getUnknownExportErrorMessage(type));
          }
        },
      };
    }
  )
)(Component);
