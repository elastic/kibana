import { StateCreator } from 'zustand';

export const sideNavState: StateCreator<SideNavState, [['zustand/devtools', never]], [], SideNavState> = (
  set,
): SideNavState => ({
  selected: '',
  setSelected: (value) => {
    set(() => ({ selected: value }));
  },
});
