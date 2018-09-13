import { compose, branch, renderComponent } from 'recompose';
import { SidebarComponent } from './sidebar_component';
import { GlobalConfig } from './global_config';

const branches = [branch(props => !props.selectedElement, renderComponent(GlobalConfig))];

export const Sidebar = compose(...branches)(SidebarComponent);
