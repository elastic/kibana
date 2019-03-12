/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { BeatTag } from '../../../common/domain_types';
import { Breadcrumb } from '../../components/navigation/breadcrumb';
import { BeatsCMTagsTable } from '../../connected_views/tags_table';
import { AppPageProps } from '../../frontend_types';

interface PageProps extends AppPageProps {
  renderAction: (area: () => JSX.Element) => void;
  intl: InjectedIntl;
}

interface PageState {
  tableRef: any;
  list: BeatTag[];
  page: number;
  size: number;
  total: number;
}

class TagsPageComponent extends React.PureComponent<PageProps, PageState> {
  constructor(props: PageProps) {
    super(props);

    props.renderAction(this.renderActionArea);
  }

  public renderActionArea = () => (
    <EuiButton
      size="s"
      color="primary"
      onClick={async () => {
        this.props.goTo('/tag/create');
      }}
    >
      <FormattedMessage
        id="xpack.beatsManagement.tags.addTagButtonLabel"
        defaultMessage="Add Tag"
      />
    </EuiButton>
  );

  public render() {
    return (
      <React.Fragment>
        <Breadcrumb
          title={i18n.translate('xpack.beatsManagement.breadcrumb.configurationTags', {
            defaultMessage: 'Configuration tags',
          })}
          path={`/overview/configuration_tags`}
        />
        <BeatsCMTagsTable
          hasSearch={true}
          options={{
            page: parseInt(this.props.urlState.tagsPage || '0', 10),
            size: parseInt(this.props.urlState.tagsSize || '25', 10),
          }}
          onOptionsChange={newState => {
            this.props.setUrlState({
              tagsPage: newState.page.toString(),
              tagsSize: newState.size.toString(),
            });
          }}
        />
      </React.Fragment>
    );
  }
}

export const TagsPage = injectI18n(TagsPageComponent);
