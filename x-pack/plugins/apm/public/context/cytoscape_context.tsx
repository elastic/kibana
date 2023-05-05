import { createContext } from 'react';
import cytoscape from 'cytoscape';

export const CytoscapeContext = createContext(cytoscape());
