import { Dispatch, SetStateAction, createContext } from 'react';

export const MapSizeContext = createContext<{
  mapSize: 'big' | 'small';
  setMapSize: Dispatch<SetStateAction<'big' | 'small'>>;
}>({ mapSize: 'small', setMapSize: () => {} });
