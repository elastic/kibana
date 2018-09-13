import { connect } from 'react-redux';

import { get } from 'lodash';
import { sizeWorkpad, setName } from '../../state/actions/workpad';
import { getWorkpad } from '../../state/selectors/workpad';

import { WorkpadConfig as Component } from './workpad_config';

const mapStateToProps = state => {
  const workpad = getWorkpad(state);

  return {
    name: get(workpad, 'name'),
    size: {
      width: get(workpad, 'width'),
      height: get(workpad, 'height'),
    },
  };
};

const mapDispatchToProps = {
  setSize: size => sizeWorkpad(size),
  setName: name => setName(name),
};

export const WorkpadConfig = connect(mapStateToProps, mapDispatchToProps)(Component);
