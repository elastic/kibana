/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { BeatTag } from '../../../common/domain_types';
import { AssignmentActionType, Table, TagsTableType } from '../../components/table';
import { tagListAssignmentOptions } from '../../components/table/assignment_schema';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { AppPageProps } from '../../frontend_types';

interface PageProps extends AppPageProps {
  renderAction: (area: JSX.Element) => void;
}

interface PageState {
  tableRef: any;
}

export class TagsPage extends React.PureComponent<PageProps, PageState> {
  constructor(props: PageProps) {
    super(props);

    this.state = {
      tableRef: React.createRef(),
    };

    if (props.urlState.tagsKBar) {
      props.containers.tags.reload(props.urlState.tagsKBar);
    }

    props.renderAction(this.renderActionArea());
  }

  public renderActionArea = () => (
    <EuiButton
      size="s"
      color="primary"
      onClick={async () => {
        // goTo('/tag/create');
      }}
    >
      Add Tag
    </EuiButton>
  );

  public render() {
    return (
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
                this.props.containers.tags.reload(this.props.urlState.tagsKBar);
              },
              onSubmit: () => null, // todo
              value: this.props.urlState.tagsKBar || '',
            }}
            assignmentOptions={{
              schema: tagListAssignmentOptions,
              type: 'primary',
              items: [],
              actionHandler: this.handleTagsAction,
            }}
            ref={this.state.tableRef}
            items={this.props.containers.tags.state.list}
            type={TagsTableType}
          />
        )}
      </WithKueryAutocompletion>
    );
  }

  private handleTagsAction = async (action: AssignmentActionType) => {
    switch (action) {
      case AssignmentActionType.Delete:
        const tags = this.getSelectedTags().map((tag: BeatTag) => tag.id);
        const success = await this.props.containers.tags.delete(tags);
        if (!success) {
          alert(
            'Some of these tags might be assigned to beats. Please ensure tags being removed are not activly assigned'
          );
        } else {
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
