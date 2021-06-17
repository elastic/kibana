import { createSelector } from 'reselect'
import { LensState } from './types'

const selectDocHasChanged = createSelector(
  (state: LensState) => state.app,
  (todos) => todos.filter((todo) => todo.completed).length
)
