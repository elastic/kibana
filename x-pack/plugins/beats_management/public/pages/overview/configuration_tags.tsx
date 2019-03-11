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
import { AssignmentActionType, Table, TagsTableType } from '../../components/table';
import { tagListActions } from '../../components/table/action_schema';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
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
  public static getDerivedStateFromProps(nextProps: PageProps, prevState: PageState) {
    if (
      parseInt(nextProps.urlState.tagsPage || '', 10) !== prevState.page ||
      parseInt(nextProps.urlState.tagsSize || '', 10) !== prevState.size
    ) {
      return {
        page: nextProps.urlState.tagsPage,
        size: nextProps.urlState.tagsSize,
      };
    }

    // No state update necessary
    return null;
  }
  constructor(props: PageProps) {
    super(props);

    this.state = {
      tableRef: React.createRef(),
      list: [],
      page: 0,
      size: 25,
      total: 0,
    };

    props.renderAction(this.renderActionArea);
  }

  public async componentDidMount() {
    const result = await this.props.libs.tags.getAll(
      this.props.urlState.tagsKBar,
      this.state.page,
      this.state.size
    );

    this.setState({
      list: result.list,
      total: result.total,
    });
  }

  public async componentDidUpdate(prevProps: PageProps, prevState: PageState) {
    if (this.state.page === prevState.page || prevState.size !== this.state.size) {
      const result = await this.props.libs.tags.getAll(
        this.props.urlState.tagsKBar,
        this.state.page,
        this.state.size
      );

      this.setState({
        list: result.list,
        total: result.total,
      });
    }
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
        <WithKueryAutocompletion libs={this.props.libs} fieldPrefix="tag">
          {autocompleteProps => (
            <Table
              kueryBarProps={{
                ...autocompleteProps,
                filterQueryDraft: 'false', // todo
                isValid: this.props.libs.elasticsearch.isKueryValid(
                  this.props.urlState.tagsKBar || ''
                ),
                onChange: (value: any) => {
                  this.props.setUrlState({ tagsKBar: value });
                },
                onSubmit: () => null, // todo
                value: this.props.urlState.tagsKBar || '',
              }}
              actions={tagListActions}
              actionHandler={this.handleTagsAction}
              ref={this.state.tableRef}
              items={this.state}
              type={TagsTableType}
            />
          )}
        </WithKueryAutocompletion>
      </React.Fragment>
    );
  }

  private handleTagsAction = async (action: AssignmentActionType) => {
    const { intl } = this.props;
    switch (action) {
      case AssignmentActionType.Delete:
        const success = await this.props.libs.tags.delete(this.getSelectedTags());
        if (!success) {
          alert(
            intl.formatMessage({
              id: 'xpack.beatsManagement.tags.someTagsMightBeAssignedToBeatsTitle',
              defaultMessage:
                'Some of these tags might be assigned to beats. Please ensure tags being removed are not activly assigned',
            })
          );
        } else {
          const result = await this.props.libs.tags.getAll(
            this.props.urlState.tagsKBar,
            this.state.page,
            this.state.size
          );

          this.setState({
            list: result.list,
            total: result.total,
          });
          if (this.state.tableRef && this.state.tableRef.current) {
            this.state.tableRef.current.resetSelection();
          }
        }
        break;
    }
  };

  private getSelectedTags = () => {
    return this.state.tableRef.current ? this.state.tableRef.current.state.selection : [];
  };
}

export const TagsPage = injectI18n(TagsPageComponent);
