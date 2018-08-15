/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'brace/mode/yaml';
import 'brace/theme/github';
import React from 'react';
import { BeatTag } from '../../../common/domain_types';
import { TagEdit } from '../../components/tag';
import { FrontendLibs } from '../../lib/lib';

interface EditTagPageProps {
  libs: FrontendLibs;
}

interface EditTagPageState {
  showFlyout: boolean;
  tag: Partial<BeatTag>;
}

export class EditTagPage extends React.PureComponent<EditTagPageProps, EditTagPageState> {
  constructor(props: EditTagPageProps) {
    super(props);

    this.state = {
      showFlyout: false,
      tag: {
        id: '',
        color: '#DD0A73',
        configuration_blocks: [],
      },
    };
  }

  public render() {
    return (
      <TagEdit
        tag={this.state.tag}
        onTagChange={(field: string, value: string) =>
          this.setState(oldState => ({
            tag: { ...oldState.tag, [field]: value },
          }))
        }
        attachedBeats={[]}
      />
    );
  }
}
