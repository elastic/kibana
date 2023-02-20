
import type { State } from './reducer';

export const getTotalErrorExist = (state: State) => {
    const {exceptions, errors} = state;
    const allEntryIds  = exceptions.map(exception => exception.entries.map(entry => entry.id)).flat();
    const errTotal = Object.keys(errors).filter(id => allEntryIds.includes(id) && errors[id]).length;
    return errTotal
}