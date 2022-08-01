#!/bin/bash
set -u
# 1:success
# 2:info
# 3:warning
# 4:error
function show_msg {
   msg=`echo $1`
   level=`echo ${2:-2}`
   case $level in

      1)
         echo -e "\033[0;32m${msg}\033[0m" ;;

      2)
         echo -e "\033[0;36m${msg}\033[0m" ;;

      3)
         echo -e "\033[0;33m${msg}\033[0m" ;;
         
      4)
         echo -e "\033[0;31m${msg}\033[0m" ;;

      *)
         echo -e "\033[0;36m${msg}\033[0m" ;;
  esac
}
