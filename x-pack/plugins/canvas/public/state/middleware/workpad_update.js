import { duplicatePage } from '../actions/pages';
import { fetchRenderable } from '../actions/elements';
import { getPages } from '../selectors/workpad';

export const workpadUpdate = ({ dispatch, getState }) => next => action => {
  next(action);

  // This middleware fetches all of the renderable elements on new, duplicate page
  if (action.type === duplicatePage.toString()) {
    // When a page has been duplicated, it will be added as the last page, so fetch it
    const pages = getPages(getState());
    const newPage = pages[pages.length - 1];

    // For each element on that page, dispatch the action to update it
    return newPage.elements.forEach(element => dispatch(fetchRenderable(element)));
  }
};
