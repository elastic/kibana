import { connect } from 'react-redux';
import { compose, withState } from 'recompose';
import * as pageActions from '../../state/actions/pages';
import { getSelectedPage, getWorkpad, getPages } from '../../state/selectors/workpad';
import { PageManager as Component } from './page_manager';

const mapStateToProps = state => ({
  pages: getPages(state),
  selectedPage: getSelectedPage(state),
  workpadId: getWorkpad(state).id,
});

const mapDispatchToProps = dispatch => ({
  addPage: () => dispatch(pageActions.addPage()),
  movePage: (id, position) => dispatch(pageActions.movePage(id, position)),
  duplicatePage: id => dispatch(pageActions.duplicatePage(id)),
  removePage: id => dispatch(pageActions.removePage(id)),
});

export const PageManager = compose(
  connect(mapStateToProps, mapDispatchToProps),
  withState('deleteId', 'setDeleteId', null)
)(Component);
